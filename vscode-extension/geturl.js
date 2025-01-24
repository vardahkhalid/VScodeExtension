// geturl.js

const vscode = require('vscode');

/**
 * Function to extract problem slug from URL
 * @param {string} url The LeetCode problem URL
 * @returns {string} The problem slug
 */
const extractSlugFromURL = (url) => {
  const regex = /\/problems\/([a-z0-9-]+)/i;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];  // Returns the problem slug (e.g., "two-sum")
  } else {
    throw new Error('Invalid LeetCode URL');
  }
};

/**
 * Function to get the problem URL from the user
 * @returns {Promise<string>} The LeetCode problem URL
 */
const getProblemURL = async () => {
  try {
    const url = await vscode.window.showInputBox({
      placeHolder: 'Enter the LeetCode problem URL',
      prompt: 'Example: https://leetcode.com/problems/two-sum/',
    });

    if (!url) {
      throw new Error('LeetCode problem URL is required');
    }

    return url;
  } catch (error) {
    vscode.window.showErrorMessage('Error: ' + error.message);
    throw error; // Rethrow error for further handling if needed
  }
};

module.exports = { extractSlugFromURL, getProblemURL };
