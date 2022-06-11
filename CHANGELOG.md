### 22.6.5

* Remove outdated completion-targets

### 22.6.4

* Remove outdated compile-targets

### 22.6.3

* Add additional compile-targets

### 22.6.2

* Add Electron and Kha to the vscodeignore file to avoid uploading them again (thanks RblSb)

### 22.6.1

* Trigger the Kha-download for the Kha-init-command if necessary

### 22.6.0

* Make sure Kha exists before trying to chmod its executables

### 22.5.2

* The Kha-download is now optional and automatically triggered when needed
* vshaxe is now automatically reconfigured after the Kha-download

### 22.5.1

* Kha is now downloaded instead of bundled - the extension automatically
  downloads the latest version and also provides an update-command

### 22.5.0

* Support the directory-structure of new Kha-revisions
* Update Kha

### 22.4.0

* Download Electron manually because Microsoft's download-extension broke
* Update Kha

### 22.2.0

* Expose more extension-functions
* Update Kha

### 21.11.0

* Update Kha

### 21.9.0

* Update Electron for Windows
* Update Kha

### 21.7.2

* Use force-device-scale-factor=1 for Electron
* Update Kha

### 21.7.1

* Update Kha

### 21.7.0

* Stop stopping on node-internal exceptions
* Update Kha

### 21.6.0

* Update Kha

### 21.5.1

* Write system-independent launch-configs
* Update Kha

### 21.5.0

* Add support for Linux/ARM
* Update Kha

### 21.4.0
* Add support for FreeBSD
* Stop chmodding kravur
* Update Kha

### 21.3.8

* Make things work with vshaxe 2.23.0
* Update Kha

### 21.3.7

* Pimp macOS support
* Update Kha

### 21.3.6

* Disable the sandbox because chowning it on Linux requires admin rights

### 21.3.5

* Fix vscode's auto-import madness

### 21.3.4

* Maybe fix the Linux chown situation

### 21.3.3

* Maybe fix the Linux chmod situation

### 21.3.2

* Maybe fix the Electron download on Linux

### 21.3.1

* Properly prevent Electron re-downloads
* Update Kha

### 21.3.0

* Integrate Electron debugging functionality
* Update Kha

### 21.2.0

* Print a warning when fallback Kha is used for compilation
* Update Kha

### 20.4.0

* Update Kha

### 20.3.0

* Update Kha

### 20.1.2

* Fix a possible task provider crash

### 20.1.1

* Fix Git Bash support on Windows

### 20.1.0

* Update Kha

### 19.2.0

* Fix task resolve in vscode 1.31
* Update Kha

### 19.1.0

* Add new build tasks for explicitly choosing graphics backends
* Update Kha

### 18.11.4

Support full builds

### 18.11.3

Update Kha

### 18.11.2

Make khaPath resolution support project-local paths

### 18.11.1

Fix build tasks

### 18.11.0

Update Kha and fix completion for some targets

### 18.9.1

Update khamake parameters

### 18.9.0

Use Kha's local Haxe for completion

### 18.8.2

Fix Krom launch configs and update Kha

### 18.8.1

Add a completion target selector

### 18.8.0

Update Kha to 5b813c246e1e689f1509a601d0effb859c722f9d

### 18.7.1

Set Haxe problem matcher

### 18.7.0

Fix tasks for vscode 1.25

### 18.6.4

Improve local Kha path check

### 18.6.3

Remove superfluous compile command

### 18.6.2

Chmod binaries on Linux and macOS

### 18.6.1

Activate on commands

### 18.6.0

Create Krom launch config

### 18.5.5

Configure vshaxe for code-completion

### 18.5.4

Be less destructive when creating the launch configuration

### 18.5.3

Create build tasks

### 18.5.2

Automatically create a launch configuration

### 18.5.1

Fix internal Kha lookup

### 18.5.0

Initial standalone release of the Kha extension
