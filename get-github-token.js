#!/usr/bin/env node
// get-github-token.js - Fetch GitHub access token from Replit connection
// This script extracts the token from your GitHub integration for use in shell scripts

async function getGitHubToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('ERROR: X_REPLIT_TOKEN not found');
    process.exit(1);
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];
    
    const accessToken = connectionSettings?.settings?.access_token || 
                       connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!accessToken) {
      console.error('ERROR: GitHub not connected or token not found');
      process.exit(1);
    }

    // Output just the token (for use in shell scripts)
    console.log(accessToken);
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Failed to fetch GitHub token:', error.message);
    process.exit(1);
  }
}

getGitHubToken();
