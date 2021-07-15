// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require("fs");
const { exec } = require('child_process');

const showOutputMessage = (content, language) => {
    return vscode.workspace.openTextDocument({
        content: content,
        language: language
    }).then((doc)=>{
        vscode.window.showTextDocument(doc, {
            preview: true
        })
    })
}

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
        echo json_encode($var, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        `;
        fs.writeFileSync('/tmp/__php-helper-tmp.php', phpContent);

        exec('php /tmp/__php-helper-tmp.php', (err, stdout, stderr) => {
            if(err) {
                vscode.window.showInformationMessage(stderr);
                return;
            }
            console.log(stdout);
            if (stdout.length >= 500) {
                showOutputMessage(stdout, 'json').then(() => {
                    vscode.commands.executeCommand('editor.action.selectAll')
                })
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
            if (stdout.length >= 500) {
                showOutputMessage(stdout, 'php').then(() => {
                    vscode.commands.executeCommand('editor.action.selectAll')
                })
                return;
            }
            vscode.window.showInformationMessage(stdout, '复制').then((value)=>{
                if(value == '复制'){
                    vscode.env.clipboard.writeText(stdout);
                }
            });
        })
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.PHPDocToMarkdown', function (textEditor, edit) {
        // The code you place here will be executed every time your command is executed
        try {
            // Display a message box to the user
            let document = textEditor.document;
            let selection = textEditor.selection;
            let content = document.getText(selection);
            if(!content){
                // vscode.window.showInformationMessage('没有选择内容');
                // return;
                content = document.getText();
            }
            if (!content) {
                vscode.window.showInformationMessage('没有内容可供解析');
                return;
            }
            let contentArr = content.replace(/\r/g, '').split("\n");
            const contextFunc = () => ({
                isClass: false,
                name: '',
                desc: '',
                properties: [],
                params: [],
                return: {},
            })
            let context = contextFunc();
            const contextList = [];
            let isEnd = false;
            let isStart = true;
            for (let i = 0; i < contentArr.length; i++) {
                if (!/^\s*\/?\*+[\s\/]*/.test(contentArr[i])) {
                    continue;
                }
                if (!isStart) {
                    // 是否开始当前注释块
                    isStart = /^\s*\/\*+\s*/.test(contentArr[i]);
                    if (!isStart) {
                        continue;
                    } else {
                        // 重新开始
                        context = contextFunc();
                    }
                }
                // 是否结束当前注释块
                isEnd = /^\s*\*+\/\s*/.test(contentArr[i]);
                // 去掉注释符号
                const line = contentArr[i].replace(/^\s*\/?\*+[\s\/]*/, '');
                if (line && line.indexOf('@') === -1) {
                    // 保留说明
                    context.desc += line + "\n";
                } else if (line.indexOf('@property') !== -1) {
                    context.isClass = true;
                    // 参数
                    const cols = line.split(/\s+/);
                    context.properties.push({
                        name: (cols[2] || '').replace(/^\$/, ''),
                        type: cols[1],
                        desc: cols[3] || '',
                    });
                }  else if (line.indexOf('@param') !== -1) {
                    context.isClass = false;
                    // 参数
                    const cols = line.split(/\s+/);
                    context.params.push({
                        name: (cols[2] || '').replace(/^\$/, ''),
                        type: cols[1],
                        desc: cols[3] || '',
                    });
                } else if (line.indexOf('@return') !== -1) {
                    const cols = line.split(/\s+/);
                    context.return = {
                        name: (cols[2] || '').replace(/^\$/, ''),
                        type: cols[1],
                        desc: cols[3] || '',
                    };
                }

                if (!context.isClass && line.indexOf('@ignore') !== -1) {
                    // 忽略当前注释块
                    isStart = false;
                }

                if (isEnd) {
                    // 获取下5行内容，匹配 类名或者函数名
                    const next5Lines = contentArr.slice(i+1, i+5);
                    let res;
                    if (context.isClass) {
                        res = next5Lines.join("").match(/class\s+([a-zA-Z_0-9]+)/)
                    } else {
                        res = next5Lines.join("").match(/function\s+([a-zA-Z_0-9]+)/)
                    }
                    if (res && res.length) {
                        context.name = res[1];
                    }
                    contextList.push(context);
                    isEnd = false;
                    isStart = false;
                }
            }

            if (!contextList.length) {
                vscode.window.showInformationMessage('没有解析到任何内容');
                return;
            }

            // console.log("contextList ", contextList);

            // 输出 MD table
            let output = '';
            contextList.map(function(c) {
                if (c.isClass) {
                    if (c.name) {
                        output += c.name + "\n\n";
                    }
                    output += c.desc + "\n";
                    output += "- 模型说明\n\n属性名 | 类型 | 描述\n-----|-----|-----\n";
                    for (let i = 0; i < c.properties.length; i++) {
                        const p = c.properties[i];
                        output += `${p.name} | ${p.type} | ${p.desc}\n`;
                    }
                } else {
                    if (c.name) {
                        output += c.name + "\n\n";
                    }
                    output += c.desc + "\n";
                    output += "- 请求参数\n\n属性名 | 类型 | 是否必填 | 描述\n-----|-----|-----|-----\n";
                    for (let i = 0; i < c.params.length; i++) {
                        const p = c.params[i];
                        output += `${p.name} | ${p.type} |    | ${p.desc}\n`;
                    }

                    output += "\n- 返回值\n\n"
                    output += "属性名 | 类型 | 是否必填 | 描述\n-----|-----|-----|-----\n";
                    output += `${c.return.name} | ${c.return.type} |    | ${c.return.desc}\n`;
                }
                output += "\n\n"
            })

            const showOutput = () => {
                vscode.workspace.openTextDocument({
                    content: output,
                    language: "markdown"
                }).then((doc)=>{
                    vscode.window.showTextDocument(doc, {
                        preview: true
                    }).then(()=>{
                        // vscode.commands.executeCommand('editor.action.selectAll')
                        vscode.commands.executeCommand('markdown.showPreviewToSide')
                    })
                })
            }

            if (output.length >= 500) {
                showOutput();
                return;
            }

            vscode.window.showInformationMessage(output, '复制', '预览').then((value)=>{
                if(value == '复制'){
                    vscode.env.clipboard.writeText(output);
                } else if (value == '预览') {
                    showOutput();
                }
            });
        } catch (error) {
            console.log("PHPHelper error", error);
        }
    }));
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;