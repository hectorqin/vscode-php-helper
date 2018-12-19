// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require("fs");
const { exec } = require('child_process');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "php-helper" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.PHPVarsToJSON', function (textEditor, edit) {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        let document = textEditor.document;
        let selection = textEditor.selection;
        let content = document.getText(selection);
        if(!content){
            vscode.window.showInformationMessage('没有选择内容');
            return;
        }
        let phpContent = `<?php
        $var = ${content};
        echo json_encode($var, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        `;
        fs.writeFileSync('/tmp/__php-helper-tmp.php', phpContent);

        exec('php /tmp/__php-helper-tmp.php', (err, stdout, stderr) => {
            if(err) {
                vscode.window.showInformationMessage(stderr);
                return;
            }
            vscode.window.showInformationMessage(stdout, '复制').then((value)=>{
                if(value == '复制'){
                    vscode.env.clipboard.writeText(stdout);
                }
            });
        })

    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.JSONToPHPVars', function (textEditor, edit) {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        let document = textEditor.document;
        let selection = textEditor.selection;
        let content = document.getText(selection);
        if(!content){
            vscode.window.showInformationMessage('没有选择内容');
            return;
        }
        content = content.replace("'", "\\'");
        let phpContent = `<?php
        $var = '${content}';
        var_export(json_decode($var, true));
        `;

        fs.writeFileSync('/tmp/__php-helper-tmp.php', phpContent);

        exec('php /tmp/__php-helper-tmp.php', (err, stdout, stderr) => {
            if(err) {
                vscode.window.showInformationMessage(stderr);
                return;
            }
            vscode.window.showInformationMessage(stdout, '复制').then((value)=>{
                if(value == '复制'){
                    vscode.env.clipboard.writeText(stdout);
                }
            });
        })
    }));
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;