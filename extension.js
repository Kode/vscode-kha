var path = require('path');
var vscode = require('vscode');

function activate(context) {
	var disposable = vscode.commands.registerCommand('kha.init', function () {
		require(path.join(vscode.extensions.getExtension('ktx.kha').extensionPath, 'Kha', 'Tools', 'khamake', 'init.js')).run('Project', vscode.workspace.rootPath, 'khafile.js');
		vscode.commands.executeCommand('workbench.action.reloadWindow');
		vscode.window.showInformationMessage('Kha project created.');
	});
	
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand('kha.compile', function () {
		var exec = require('child_process').exec;
		var cmd = 'haxe project-html5.hxml';
		exec(cmd,{cwd: vscode.workspace.rootPath + '/build'}, function(error, stdout, stderr) {
			if(error){vscode.window.showInformationMessage(error + " : " + stderr);}
		});
		
	});
	
	context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {
}

exports.deactivate = deactivate;
