
import ora from 'ora';
import pkg from 'enquirer';
const { prompt } = pkg;
import toml from 'toml-patch';
import chalk from 'chalk';

import eyecandy from "./eyecandy.js";
import utils from './utils.js';

export default class flow {

    static async detectBlowfish() {
        var exists = utils.directoryExists('./themes/blowfish');
        if (exists) {
            return true;
        } else {
            return false;
        }
    }

    static async showMain(message) {

        var blowfishIsInstalled = await flow.detectBlowfish();

        await eyecandy.showWelcome();

        var choices = [];

        for (var i in options) {
            if (!options[i].hasOwnProperty('blowfishIsInstalled'))
                choices.push(options[i].text);
            else if (options[i].blowfishIsInstalled && blowfishIsInstalled)
                choices.push(options[i].text);
            else if (!options[i].blowfishIsInstalled && !blowfishIsInstalled)
                choices.push(options[i].text);
        }

        if (message) {
            console.log(message);
        }

        const response = await prompt({
            type: 'AutoComplete',
            name: 'option',
            message: 'What do you need help with?',
            limit: 10,
            initial: 0,
            choices: choices
        });

        for (var i in options) {
            if (options[i].text === response.option) {
                options[i].action();
                return
            }
        }
    }

    static async configureNew(directory, exitAfterRun) {
        const spinner = ora('Checking for dependencies').start();
        await flow.checkHugo(spinner);
        await flow.checkGit(spinner);

        var response = {};

        if (!directory) {

            response = await prompt({
                type: 'input',
                name: 'directory',
                default: 'newSite',
                message: 'Where do you want to generate your website (. for current folder)?'
            });

            if (response.directory !== '.') {
                response.directory = './' + response.directory;
            }

        } else {
            response.directory = directory;
        }

        const prespinner = ora('Checking folder').start();

        var dirExists = utils.directoryExists('./' + response.directory)
        var dirIsEmpty = utils.directoryIsEmpty('./' + response.directory)

        if (dirExists && !dirIsEmpty) {
            prespinner.fail('Directory already exists and is not empty.');
            process.exit(0);
        }

        prespinner.succeed('Folder ok...');

        const hugospinner = ora('Creating Hugo site').start();
        await utils.run('hugo new site ' + response.directory, false);
        hugospinner.succeed('Hugo site created');

        var precommand = 'cd ' + response.directory + ' && ';
        const gitspinner = ora('Initializing Git').start();
        await utils.run(precommand + 'git init', false)
        gitspinner.succeed('Git initialized');

        const blowfishspinner = ora('Installing Blowfish').start();
        await utils.run(precommand + 'git submodule add --depth 1 -b main https://github.com/nunocoracao/blowfish.git themes/blowfish', false);
        blowfishspinner.succeed('Blowfish installed');

        const configblowfishspinner = ora('Configuring Blowfish').start();
        await utils.run(precommand + 'mkdir -p config/_default', false);
        await utils.run(precommand + 'cp ./themes/blowfish/config/_default/* ./config/_default/', false);
        await utils.run(precommand + 'sed -i "" "s/# theme/theme/" ./config/_default/config.toml', false);
        configblowfishspinner.succeed('Blowfish configured');

        if (exitAfterRun)
            process.exit(0);
        else {
            process.chdir(response.directory);
            flow.showMain('Blowfish configured in ' + response.directory + ', current working directory updated.');
        }

    }

    static async configureExisting(exitAfterRun) {

        var blowfishIsInstalled = await flow.detectBlowfish();
        if (blowfishIsInstalled) {
            console.log('Blowfish is already installed in this folder.');
            process.exit(0);
        }

        const spinner = ora('Checking for dependencies').start();
        await flow.checkGit(spinner);

        const gitspinner = ora('Initializing Git').start();
        await utils.run('git init', false)
        gitspinner.succeed('Git initialized');

        const blowfishspinner = ora('Installing Blowfish').start();
        await utils.run('git submodule add --depth 1 -b main https://github.com/nunocoracao/blowfish.git themes/blowfish', false);
        await utils.run('git submodule update --remote --merge', false);
        blowfishspinner.succeed('Blowfish installed');

        const configblowfishspinner = ora('Configuring Blowfish').start();
        await utils.run('mkdir -p config/_default', false);
        await utils.run('cp ./themes/blowfish/config/_default/* ./config/_default/', false);
        await utils.run('sed -i "" "s/# theme/theme/" ./config/_default/config.toml', false);
        configblowfishspinner.succeed('Blowfish configured');

        if (exitAfterRun)
            process.exit(0);
        else {
            var flag = flow.detectBlowfish()
            if (flag)
                flow.showMain('Blowfish installed. Proceed with configuration.');
            else
                flow.showMain('Blowfish not installed. Please check the logs.');
        }

    }

    static async update(exitAfterRun) {
            
            var blowfishIsInstalled = await flow.detectBlowfish();
            if (!blowfishIsInstalled) {
                console.log('Blowfish is not installed in this folder.');
                process.exit(0);
            }
    
            const spinner = ora('Checking for dependencies').start();
            await flow.checkHugo(spinner);
            await flow.checkGit(spinner);
    
            const configblowfishspinner = ora('Updating Blowfish').start();
            await utils.run('git submodule update --remote --merge', false);
            configblowfishspinner.succeed('Blowfish updated');
    
            if (exitAfterRun)
                process.exit(0);
            else {
                flow.showMain('Blowfish updated.');
            }
    }

    static async runServer() {
        const spinner = ora('Checking for dependencies').start();
        await flow.checkHugo(spinner);
        console.clear();
        await utils.run('hugo server', true);
    }

    static async generateSite() {
        const spinner = ora('Checking for dependencies').start();
        await flow.checkHugo(spinner);
        console.clear();
        await utils.run('hugo', true);
    }

    static async checkHugo(spinner) {
        return new Promise((resolve, reject) => {
            spinner.text = 'Checking Hugo';
            utils.detectCommand('hugo')
                .then(() => {
                    spinner.succeed('Hugo is available');
                    resolve();
                })
                .catch(() => {
                    spinner.fail('Hugo is not available');
                    console.log('Please install Hugo and try again.');
                    console.log('You can download it from https://gohugo.io/getting-started/installing/');
                    process.exit(0);
                })
        });
    }

    static async checkGit(spinner) {
        return new Promise((resolve, reject) => {
            spinner.text = 'Checking Git';
            utils.detectCommand('git')
                .then(() => {
                    spinner.succeed('Git is available');
                    resolve();
                })
                .catch(() => {
                    spinner.fail('Git is not available');
                    console.log('Please install Git and try again.');
                    process.exit(0);
                })
        });
    }

    static async enterConfigMode() {

        var blowfishIsInstalled = await flow.detectBlowfish();
        if (!blowfishIsInstalled) {
            console.log('Blowfish is not installed in this folder.');
            process.exit(0);
        }

        const spinner = ora('Checking for dependencies').start();
        await flow.checkHugo(spinner);

        utils.spawn('hugo', ['server'], false);

        utils.run('open http://localhost:1313', false);

        flow.displayConfigOptions();

    }

    static async displayConfigOptions() {
        var choices = [];

        for (var i in configOptions) {
            choices.push(configOptions[i].text);
        }

        console.clear()
        const response = await prompt({
            type: 'AutoComplete',
            name: 'option',
            message: 'What do you want to configure? start typing to search for options.',
            limit: 20,
            initial: 0,
            choices: choices
        });

        for (var i in configOptions) {
            if (configOptions[i].text === response.option) {
                configOptions[i].action();
                return
            }
        }
    }

    static async configLoop(file, parent, variable, description) {

        if (!utils.fileExists(file)) {
            console.log('File ' + file + ' does not exist.');
            process.exit(0);
        }

        var data = toml.parse(utils.openFile(file).toString());

        var currentValue = null

        if (parent && data[parent] && data[parent][variable]) {
            currentValue = data[parent][variable]
        } else if (!parent && data[variable]) {
            currentValue = data[variable]
        }

        console.log("Configuring:\n" + chalk.blue(variable) + (description ? ' - ' + description : ''))

        const response = await prompt([
            {
                type: 'input',
                name: 'value',
                default: currentValue,
                message: 'What is the new value?'
            }
        ]);

        var newValue = response.value
        if(newValue === currentValue)
            return

        if (!parent) {
            data[variable] = newValue
        } else if (data[parent]) {
            data[parent][variable] = newValue
        } else {
            data[parent] = {}
            data[parent][variable] = newValue
        }

        utils.saveFileSync(file, toml.stringify(data));
    }

    static async configLinks(file, parent, variable, description) {

        if (!utils.fileExists(file)) {
            console.log('File ' + file + ' does not exist.');
            process.exit(0);
        }

        var data = toml.parse(utils.openFile(file).toString());

        console.log("Configuring:\n" + chalk.blue(variable) + (description ? ' - ' + description : ''))

        const response = await prompt([
            {
                type: 'multiselect',
                name: 'value',
                message: 'Which links to you want to configure for your profile?\nSelect using spacebar and press enter when done.',
                choices: [
                    { name: 'email' },
                    { name: 'link' },
                    { name: 'bluesky' },
                    { name: 'discord' },
                    { name: 'github' },
                    { name: 'instagram' },
                    { name: 'keybase' },
                    { name: 'linkedin' },
                    { name: 'mastodon' },
                    { name: 'medium' },
                    { name: 'reddit' },
                    { name: 'telegram' },
                    { name: 'tiktok' },
                    { name: 'twitter' },
                    { name: 'x-twitter' },
                    { name: 'whatsapp' },
                    { name: 'youtube' }
                ]
            }
        ]);


        var linksQuestions = [];
        for (var i in response.value) {
            linksQuestions.push({
                type: 'input',
                name: response.value[i],
                message: 'What URL do you want to configure for ' + response.value[i] + '?'
            });
        }

        const responseLinks = await prompt(linksQuestions);

        if (!data.author)
            data.author = {};

        data.author.links = [];

        for (const [key, value] of Object.entries(responseLinks)) {
            var obj = {}
            obj[key] = value;
            data.author.links.push(obj);
        }

        utils.saveFileSync(file, toml.stringify(data));
    }

    static async configImage(file, parent, variable, description) {

        if (!utils.fileExists(file)) {
            console.log('File ' + file + ' does not exist.');
            process.exit(0);
        }

        var data = toml.parse(utils.openFile(file).toString());

        var currentValue = null

        if (parent && data[parent] && data[parent][variable]) {
            currentValue = data[parent][variable]
        } else if (!parent && data[variable]) {
            currentValue = data[variable]
        }

        console.log("Configuring:\n" + chalk.blue(variable) + (description ? ' - ' + description : ''))

        const response = await prompt([
            {
                type: 'input',
                name: 'value',
                default: currentValue,
                message: 'Where image do you want to use? (full image path - drag and drop file for path)'
            }
        ]);

        var newValue = response.value

        if(newValue === currentValue)
            return

        if (!utils.fileExists(newValue)) {
            console.log('File ' + newValue + ' does not exist.');
            process.exit(0);
        }

        utils.run('cp ' + newValue + ' ./assets/', false);
        newValue = newValue.split('/').pop();

        if (!parent) {
            data[variable] = newValue
        } else if (data[parent]) {
            data[parent][variable] = newValue
        } else {
            data[parent] = {}
            data[parent][variable] = newValue
        }

        utils.saveFileSync(file, toml.stringify(data));
    }

}


var configOptions = [

    //config/_default/languages.en.toml
    {
        text: 'Site\'s title',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                null, 
                'title', 
                'The title of the website. This will be displayed in the site header and footer.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Site\'s logo',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'params', 
                'logo', 
                'Site\'s logo, the logo file should be provided at 2x resolution and supports any image dimensions.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Site\'s secondary logo',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'params', 
                'secondaryLogo', 
                'The logo file should be provided at 2x resolution and supports any image dimensions. This should have an inverted/contrasting colour scheme to logo. If set, this logo will be shown when users toggle from the defaultAppearance mode.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Site\'s description',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'params', 
                'description', 
                'The website description. This will be used in the site metadata.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Author\'s name',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'author', 
                'name', 
                'The author’s name. This will be displayed in article footers, and on the homepage when the profile layout is used.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Author\'s picture',
        action: async () => {
            await flow.configImage(
                './config/_default/languages.en.toml', 
                'author', 
                'image', 
                'Image file of the author. The image should be a 1:1 aspect ratio.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Author\'s headline',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'author', 
                'headline', 
                'A Markdown string containing the author’s headline. It will be displayed on the profile homepage under the author’s name.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Author\'s bio',
        action: async () => {
            await flow.configLoop(
                './config/_default/languages.en.toml', 
                'author', 
                'bio', 
                'A Markdown string containing the author’s bio. It will be displayed in article footers.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Author\'s links',
        action: async () => {
            await flow.configLinks(
                './config/_default/languages.en.toml', 
                'author', 
                'links', 
                'The links to display alongside the author’s details. The config file contains example links which can simply be uncommented to enable. The order that the links are displayed is determined by the order they appear in the array. ');
            flow.displayConfigOptions();
        }
    },

    //config/_default/params.toml
    {
        text: 'Color scheme',
        action: async () => {
            await flow.configLoop(
                './config/_default/params.toml', 
                null, 
                'colorScheme', 
                'The theme colour scheme to use. Valid values are blowfish (default), Blowfish (default), Avocado, Fire, Forest, Princess, Neon, Bloody, Terminal, Marvel, Noir, Autumn, Congo, Slate. Custom themes are supported check Blowfish documentation.');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Default Appearance',
        action: async () => {
            await flow.configLoop(
                './config/_default/params.toml', 
                null, 
                'defaultAppearance', 
                'The default theme appearance, either light or dark');
            flow.displayConfigOptions();
        }
    },
    {
        text: 'Auto Switch Appearance',
        action: async () => {
            await flow.configLoop(
                './config/_default/params.toml', 
                null, 
                'autoSwitchAppearance', 
                'Whether the theme appearance automatically switches based upon the visitor’s operating system preference. Set to false to force the site to always use the defaultAppearance.');
            flow.displayConfigOptions();
        }
    },
    //.config/_default/config.toml
    {
        text: 'baseURL - The URL to the root of the website.',
        action: async () => {
            await flow.configLoop(
                './config/_default/config.toml', 
                null, 
                'baseURL', 
                'The URL to the root of the website.');
            flow.displayConfigOptions();
        }
    },
    //exit
    {
        text: 'Exit configuration mode',
        action: () => {
            flow.showMain('Configuration mode exited.');
        }
    },
]


var options = [

    {
        text: 'Enter configuration mode',
        blowfishIsInstalled: true,
        action: flow.enterConfigMode
    },
    {
        text: 'Run a local server with Blowfish',
        blowfishIsInstalled: true,
        action: flow.runServer
    },
    {
        text: 'Generate the static site with Hugo',
        blowfishIsInstalled: true,
        action: flow.generateSite
    },
    {
        text: 'Update Blowfish installation',
        blowfishIsInstalled: true,
        action: flow.update
    },
    {
        text: 'Setup a new website with Blowfish',
        blowfishIsInstalled: false,
        action: flow.configureNew
    },
    {
        text: 'Install Blowfish on an existing website',
        blowfishIsInstalled: false,
        action: flow.configureExisting
    },
    {
        text: 'Exit',
        action: eyecandy.showBye
    }
]