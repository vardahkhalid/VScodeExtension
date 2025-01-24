const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { getProblemURL } = require('./geturl');
const { fetchTestCases } = require('./fetchTestCases');

let lastUrl = ''; // Declare the last URL variable globally to track the last problem URL.

const extractSlugFromURL = (url) => {
  const regex = /\/problems\/([a-z0-9-]+)/i;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new Error('Invalid LeetCode URL');
  }
};

/**
 * Command to fetch test cases for a given problem.
 */
const fetchTestCasesCommand = async () => {
  try {
    const url = await getProblemURL();  // Get the URL of the current problem.
    lastUrl = url;  // Save the URL to the global variable.
    const slug = extractSlugFromURL(url);

    vscode.window.showInformationMessage(`Fetching test cases for problem: ${slug}`);
    await fetchTestCases(slug);  // Fetch and save test cases locally.
  } catch (error) {
    vscode.window.showErrorMessage('Error: ' + error.message);
  }
};

/**
 * Command to run test cases for the problem.
 */
const runTestCasesCommand = async () => {
  const outputChannel = vscode.window.createOutputChannel('Test Cases Output');
  outputChannel.show();

  try {
    if (!lastUrl) {
      return vscode.window.showErrorMessage('No LeetCode problem URL found. Please fetch test cases first.');
    }

    const slug = extractSlugFromURL(lastUrl);  // Get slug from the stored last URL.
    const testCaseFolderPath = path.join(vscode.workspace.rootPath || vscode.env.appRoot, 'test_cases', slug);

    if (!fs.existsSync(testCaseFolderPath)) {
      return vscode.window.showErrorMessage(`No test cases found for problem: ${slug}`);
    }

    const files = fs.readdirSync(testCaseFolderPath);
    const inputFiles = files.filter(file => file.startsWith('ip') && file.endsWith('.txt'));
    const outputFiles = files.filter(file => file.startsWith('op') && file.endsWith('.txt'));

    if (inputFiles.length !== outputFiles.length) {
      return vscode.window.showErrorMessage('Mismatch between the number of input and output files');
    }

    const inputs = inputFiles.map(file => fs.readFileSync(path.join(testCaseFolderPath, file), 'utf-8').trim());
    const expectedOutputs = outputFiles.map(file => fs.readFileSync(path.join(testCaseFolderPath, file), 'utf-8').trim());

    const solutionFilePath = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      openLabel: 'Select your solution file',
      filters: {
        'Python Files': ['py'],
        'C++ Files': ['cpp'],
        'JavaScript Files': ['js'],
      },
    });

    if (!solutionFilePath || solutionFilePath.length === 0) {
      return vscode.window.showErrorMessage('Solution file is required');
    }

    const solutionPath = solutionFilePath[0].fsPath;
    console.log(`Selected solution file path: ${solutionPath}`);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const expectedOutput = expectedOutputs[i];
      console.log(`Running test case ${i + 1} with input: ${input}`);
      console.log(`Expected output for test case ${i + 1}: ${expectedOutput}`);

      const fileExtension = path.extname(solutionPath);
      let execCommand = '';
      let execOptions = {};

      switch (fileExtension) {
        case '.py':
          execCommand = `python ${solutionPath}`;
          execOptions = { input: input };
          break;

        case '.js':
          execCommand = `node ${solutionPath}`;
          execOptions = { input: input };
          break;

        case '.cpp':
          const compiledExecPath = solutionPath.replace('.cpp', '.exe');

          try {
            await new Promise((resolve, reject) => {
              exec(`g++ ${solutionPath} -o ${compiledExecPath}`, (compileError, compileStdout, compileStderr) => {
                if (compileError) {
                  outputChannel.appendLine(`C++ Compilation Error: ${compileStderr}`);
                  console.log(`C++ Compilation failed for test case ${i + 1}: ${compileStderr}`);
                  return reject(new Error(`Compilation failed for test case ${i + 1}`));
                }

                console.log(`Compilation successful for test case ${i + 1}: ${compileStdout}`);
                outputChannel.appendLine(`Compilation successful: ${compileStdout}`);

                const numsString = input.match(/\[([0-9, ]+)\]/)[1];
                const nums = numsString.split(',').map(num => parseInt(num.trim()));

                console.log(`Parsed nums for test case ${i + 1}: ${nums}`);

                const formattedInput = nums.join(' ');
                const n = nums.length;
                const fullInput = `${n}\n${formattedInput}`;
                console.log(`Formatted input for test case ${i + 1}: ${fullInput}`);

                const runExecutable = spawn(compiledExecPath, [], {
                  stdio: ['pipe', 'pipe', 'pipe']
                });

                runExecutable.stdin.write(fullInput);
                runExecutable.stdin.end();

                runExecutable.stdout.on('data', (data) => {
                  const actualOutput = data.toString().trim();
                  console.log(`Output for test case ${i + 1}: ${actualOutput}`);

                  if (actualOutput === expectedOutput) {
                    outputChannel.appendLine(`Test case ${i + 1} PASSED!`);
                  } else {
                    outputChannel.appendLine(`Test case ${i + 1} FAILED!`);
                    outputChannel.appendLine(`Expected: ${expectedOutput}`);
                    outputChannel.appendLine(`Received: ${actualOutput}`);
                  }

                  resolve();  // Ensure the loop continues after this test case is done
                });

                runExecutable.stderr.on('data', (data) => {
                  console.error(`stderr for test case ${i + 1}: ${data.toString()}`);
                });

                runExecutable.on('exit', (code) => {
                  if (code !== 0) {
                    console.error(`Executable failed for test case ${i + 1} with code: ${code}`);
                  }
                });
              });
            });
          } catch (err) {
            console.error(`Error during test case ${i + 1}: ${err.message}`);
            outputChannel.appendLine(`Error during test case ${i + 1}: ${err.message}`);
            resolve();
          }
          break;

        default:
          return vscode.window.showErrorMessage('Unsupported file type');
      }

      if (execCommand) {
        exec(execCommand, execOptions, (runError, runStdout, runStderr) => {
          if (runError) {
            console.log(`Error running code for test case ${i + 1}: ${runStderr}`);
            outputChannel.appendLine(`Error running code for test case ${i + 1}: ${runStderr}`);
            return;
          }

          const actualOutput = runStdout.trim();
          console.log(`Actual output for test case ${i + 1}: ${actualOutput}`);

          if (actualOutput === expectedOutput) {
            outputChannel.appendLine(`Test case ${i + 1} PASSED SUCCESSSFULLYYYYY!`);
          } else {
            outputChannel.appendLine(`Test case ${i + 1} FAILED ;-;!`);
            outputChannel.appendLine(`Expected: ${expectedOutput}`);
            outputChannel.appendLine(`Received: ${actualOutput}`);
          }

          resolve();
        });
      }
    }
  } catch (error) {
    outputChannel.appendLine('Error: ' + error.message);
    console.log('Error: ' + error.message);
  }
};

/**
 * Activate function to register the commands
 */
function activate(context) {
  let fetchTestCasesDisposable = vscode.commands.registerCommand('vscode-extension.fetchTestCases', fetchTestCasesCommand);
  let runTestCasesDisposable = vscode.commands.registerCommand('vscode-extension.runTestCases', runTestCasesCommand);
  
  context.subscriptions.push(fetchTestCasesDisposable);
  context.subscriptions.push(runTestCasesDisposable);
}

exports.activate = activate;
