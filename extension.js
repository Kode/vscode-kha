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
		const fs = require('fs');
		fs.stat(path.resolve(vscode.workspace.rootPath, 'Kha'), (err, stats) => {
			let options = {
				from: vscode.workspace.rootPath,
				to: path.join(vscode.workspace.rootPath, 'build'),
				projectfile: 'khafile.js',
				target: 'debug-html5',
				vr: 'none',
				pch: false,
				intermediate: '',
				graphics: 'direct3d9',
				visualstudio: 'vs2015',
				kha: '',
				haxe: '',
				ogg: '',
				aac: '',
				mp3: '',
				h264: '',
				webm: '',
				wmv: '',
				theora: '',
				kfx: '',
				krafix: '',
				nokrafix: false,
				embedflashassets: false,
				compile: false,
				run: false,
				init: false,
				name: 'Project',
				server: false,
				port: 8080,
				debug: false,
				silent: false
			};
			if (err == null) {
				try {
					require(path.join(vscode.workspace.rootPath, 'Kha/Tools/khamake/main.js'))
						.run(options, {
							info: message => {
								console.log(message);
							}, error: message => {
								console.error(message);
							}
						}, function (name) { });
				}
				catch (error) {
					console.error('Error: ' + error.toString());
				}
			}
			else {
				try {
					require(path.join(findKha(), 'Tools/khamake/main.js'))
						.run(options, {
							info: message => {
								console.log(message);
							}, error: message => {
								console.error(message);
							}
						}, function (name) { });
				}
				catch (error) {
					console.error('Error: ' + error.toString());
				}
			}
		});
	});

	context.subscriptions.push(disposable);
};

exports.deactivate = function () {

};

exports.findKha = function () {
	return findKha();
};
