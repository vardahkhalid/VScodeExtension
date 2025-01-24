// fetchTestCases.js

const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const htmlEntities = require('html-entities'); 
const { spawn, exec } = require('child_process');

const ALFA_API_URL = 'https://alfa-leetcode-api.onrender.com';

// Regular expressions to extract input and output
const inputRegex = /<strong>Input:<\/strong>\s*([\s\S]*?)(?=<strong>Output:<\/strong>|<strong>Explanation:<\/strong>|$)/g;
const outputRegex = /<strong>Output:<\/strong>\s*([\s\S]*?)(?=<strong>Explanation:<\/strong>|<\/pre>)/g;

/**
 * Fetches test cases from Alfa LeetCode API
 * @param {string} slug Problem slug (e.g., "two-sum")
 */
const fetchTestCases = async (slug) => {
  try {
    const response = await axios.get(`${ALFA_API_URL}/select?titleSlug=${slug}`);

    if (response.data) {
      const { question, topicTags } = response.data;
      console.log("Question:", question);
    }

    // Extract inputs and outputs from the question description
    const inputs = [];
    const outputs = [];
    let inputMatch;
    let outputMatch;

    while ((inputMatch = inputRegex.exec(response.data.question)) !== null) {
      inputs.push(inputMatch[1].trim());
    }

    while ((outputMatch = outputRegex.exec(response.data.question)) !== null) {
      outputs.push(outputMatch[1].trim());
    }

    console.log(`Fetched ${inputs.length} inputs and ${outputs.length} outputs`);

    // Define directory to store test case files
    const workspaceFolder = vscode.workspace.rootPath || vscode.env.appRoot;
    const dirPath = path.join(workspaceFolder, 'test_cases');  

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);  // Create the directory if it doesn't exist
    }

    const problemFolder = path.join(dirPath, slug);
    if (!fs.existsSync(problemFolder)) {
      fs.mkdirSync(problemFolder);  // Create folder for the problem
    }

    // Save inputs and outputs as text files
    for (let i = 0; i < inputs.length; i++) {
      const inputFilePath = path.join(problemFolder, `ip${i + 1}.txt`);
      fs.writeFileSync(inputFilePath, inputs[i]);

      const outputFilePath = path.join(problemFolder, `op${i + 1}.txt`);
      fs.writeFileSync(outputFilePath, outputs[i]);
    }

    vscode.window.showInformationMessage(`Test cases for ${slug} have been saved!`);
  } catch (error) {
    vscode.window.showErrorMessage('Error fetching test cases: ' + error.message);
  }
};

module.exports = { fetchTestCases };
