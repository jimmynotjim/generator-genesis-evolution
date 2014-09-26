'use strict';
var util    = require('util');
var path    = require('path');
var yeoman  = require('yeoman-generator');
var fs      = require('fs-extra');
var chalk   = require('chalk');
var glob    = require('glob');

var EvolvedGenerator = yeoman.generators.Base.extend({
  init: function () {
    this.prompts  = [];
    this.pkg      = require('../package.json');

    this.on('end', function () {
      this.config.save();
      this.log.info('Running ' + chalk.yellow('bower install') + ' & ' + chalk.yellow('npm install') + ' for you to install the required dependencies. If this fails, try running the command yourself.');
      if (!this.options['skip-install']) {
        this.installDependencies({
          bower:        true,
          npm:          true,
          skipMessage:  true,
          callback:     function() {
            this.log.ok('All done! Run ' + chalk.yellow('grunt build:dev') + ' and ' + chalk.yellow('grunt watch') + ' to get started!');
          }.bind(this)
        });
      }
    });
  },
  promptForName: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.name;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'projName',
      message:  'Project Name (e.g. MySite)',
      default:  function() {
        return existing() || path.basename(this.env.cwd);
      }.bind(this)
    });
  },
  promptForShortName: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.shortName;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'projShortName',
      message:  'Project short name (e.g. mscom)',
      default:  function() {
        var ext       = path.extname(this.env.cwd);
        var extname   = ext.replace('.','');
        var base      = path.basename(this.env.cwd).replace(ext, '');
        var basename  = ( /[A-Z]/.test(base) ) ? base.replace(/[^A-Z]/g, '') : base.charAt(0);

        return existing() || ( basename + extname ).toLowerCase();
      }.bind(this)
    });
  },
  promptForAuthorName: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.author.name;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      type:     'text',
      name:     'authorName',
      message:  'Author Name (e.g. John Smith)',
      default:  function() {
        return existing() || '';
      }.bind(this)
    });
  },
  promptForAuthorURI: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.author.url
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      type:     'text',
      name:     'authorURI',
      message:  'Author URI (e.g. www.johnsmith.com)',
      default:  function() {
        return existing() || '';
      }.bind(this)
    });
  },
  promptForDescription: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.description;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      type:     'text',
      name:     'projDescription',
      message:  'Project Description',
      default:  function() {
        return existing() || '';
      }.bind(this)
    });
  },
  promptForVersion: function() {
    var existing = function() {
      try {
        var bower = require(path.join(this.env.cwd, 'bower.json'));

        return bower.version;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      type:     'text',
      name:     'projVersion',
      message:  'Project version',
      default:  function() {
        return existing() || '0.1.0';
      }.bind(this)
    });
  },
  searchForThemesDir: function() {
    var props = this.props = [];

    glob.sync('**/wp-content/themes', function(err, matches) {
      if (err) throw err;

      if (matches.length) {
        props.themesDir = matches[0];
      }
    });
  },
  promptForThemesDir: function() {
    this.prompts.push({
      type:     'text',
      name:     'themesDir',
      message:  'Themes directory',
      default:  function() {
        return this.props.themesDir || 'web/wp-content/themes';
      }.bind(this)
    });
  },
  promptForChild: function() {
    var existing = function(response) {
      var childLoc = path.join(response.themesDir, response.projShortName + '-theme');

      try {
        var style = this.readFileAsString(path.join(childLoc, 'style.css'));

        if (style.length) {
          return true;
        }
      } catch(e) {}
    }.bind(this);

    this.prompts.push({
      when:     function(response) {
        return existing(response);
      },
      type:     'confirm',
      name:     'writeChild',
      message:  'Overwrite existing child theme?',
      default:  'no'
    });
  },
  ask: function() {
    var done = this.async();

    // have Yeoman greet the user.
    console.log(this.yeoman);

    this.prompt(this.prompts, function(props) {
      this.props = props;

      done();
    }.bind(this));
  },
  ready: function() {
    this.log.write('\n');
    this.log.info( chalk.green('Here we go!') );
  },
  cloneThemeFiles: function() {
    this.log.info('Copying theme files...');

    var done = this.async();
    var existing = function(location) {
      try {
        var style = this.readFileAsString(path.join(location, 'style.css'));

        if (style.length) {
          return true;
        } else {
          return false;
        }
      } catch(e) {}
    }.bind(this);

    var themesDir   = this.props.themesDir;
    var childName   = this.props.projShortName + '-theme';
    var parentDir   = path.join(themesDir, '/evolved-parent-theme')
    var childDir    = path.join(themesDir, childName);
    var writeChild  = !existing(childDir) || this.props.writeChild;

    this.remote('wp-evolved', 'evolved-theme', 'master', function(err, remote) {
      remote.directory('./themes/evolved-parent-theme', parentDir);

      if (writeChild) {
        remote.directory('./themes/evolved-child-theme', childDir);
      }

      done();
    });
  },
  writeProjectFiles: function() {
    this.log.info('Writing project files...');

    var themesDir   = this.props.themesDir;
    var childName   = this.props.projShortName + '-theme';
    var childDir    = path.join(themesDir, childName);

    this.copy('_gitignore', '.gitignore');
    this.copy('_editorconfig', '.editorconfig');

    this.copy('_jshintrc', '.jshintrc');

    this.template('_Gruntfile.js', 'Gruntfile.js');
    this.template('_bower.json', 'bower.json');
    this.template('_package.json', 'package.json');
  }
});

module.exports = EvolvedGenerator;
