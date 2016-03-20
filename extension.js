"use strict";

var path = require('path');
var vscode = require('vscode');

function findKha() {
	let khapath = vscode.workspace.getConfiguration('kha').khaPath;
	if (khapath.length > 0) return khapath;
	return path.join(vscode.extensions.getExtension('ktx.kha').extensionPath, 'Kha');
}

exports.activate = function (context) {
	let disposable = vscode.commands.registerCommand('kha.init', function () {
		require(path.join(findKha(), 'Tools', 'khamake', 'init.js')).run('Project', vscode.workspace.rootPath, 'khafile.js');
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
};

exports.deactivate = function () {

};

exports.findKha = function () {
	return findKha();
};
