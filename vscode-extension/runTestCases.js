const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const runTestCasesCommand = async () => {
  const outputChannel = vscode.window.createOutputChannel('Test Cases Output');
  outputChannel.show();

  try {
    const slug = lastUrl ? extractSlugFromURL(lastUrl) : null;
    if (!slug) {
      return vscode.window.showErrorMessage('No test case folder found. Please fetch test cases first.');
    }

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

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const expectedOutput = expectedOutputs[i];

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
          await new Promise((resolve, reject) => {
            exec(`g++ ${solutionPath} -o ${compiledExecPath}`, (compileError, compileStdout, compileStderr) => {
              if (compileError) {
                outputChannel.appendLine(`C++ Compilation Error: ${compileStderr}`);
                return reject(new Error(`Compilation failed`));
              }

              const numsString = input.match(/\[([0-9, ]+)\]/)[1];
              const nums = numsString.split(',').map(num => parseInt(num.trim()));

              const formattedInput = nums.join(' ');
              const n = nums.length;
              const fullInput = `${n}\n${formattedInput}`;

              const runExecutable = spawn(compiledExecPath, [], {
                stdio: ['pipe', 'pipe', 'pipe']
              });

              runExecutable.stdin.write(fullInput);
              runExecutable.stdin.end();

              runExecutable.stdout.on('data', (data) => {
                const actualOutput = data.toString().trim();
                if (actualOutput === expectedOutput) {
                  outputChannel.appendLine(`Test case ${i + 1} PASSED!`);
                } else {
                  outputChannel.appendLine(`Test case ${i + 1} FAILED!`);
                }

                resolve();
              });
            });
          });
          break;

        default:
          return vscode.window.showErrorMessage('Unsupported file type');
      }

      if (execCommand) {
        exec(execCommand, execOptions, (runError, runStdout, runStderr) => {
          if (runError) {
            outputChannel.appendLine(`Error running code for test case ${i + 1}: ${runStderr}`);
            return;
          }

          const actualOutput = runStdout.trim();
          if (actualOutput === expectedOutput) {
            outputChannel.appendLine(`Test case ${i + 1} PASSED!`);
          } else {
            outputChannel.appendLine(`Test case ${i + 1} FAILED!`);
            outputChannel.appendLine(`Expected: ${expectedOutput}`);
            outputChannel.appendLine(`Received: ${actualOutput}`);
          }
        });
      }
    }
  } catch (error) {
    outputChannel.appendLine('Error: ' + error.message);
  }
};

module.exports = { runTestCasesCommand };
