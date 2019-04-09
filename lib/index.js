#!/usr/bin/env node
"use strict";

const program = require("commander");
const inquirer = require("inquirer");
const path = require("path");
const mkdirp = require("make-dir");
const fs = require("fs");
const globby = require("globby");
const handlebars = require("handlebars");
const chalk = require("chalk");
const ora = require("ora");
const series = require("p-each-series");
const { version } = require("../package.json");
const which = require("which");

async function cli() {
  // cli asking for folder name
  program
    .name("bento-builder")
    .version(version)
    .usage("[folder name]")
    .parse(process.argv);

  const folder = program.args[0];

  if (!folder) {
    console.log("");
    console.log(
      chalk.red("bento-builder must be initialized with a folder name")
    );
    console.log("");
    program.help();
    process.exit(1);
  }

  let manager = "npm";

  if (which.sync("yarn", { nothrow: true })) {
    manager = "yarn";
  }

  // prompt required info
  const info = await inquirer.prompt([
    {
      name: "name",
      type: "input",
      message: "Package name",
      default: folder
    },
    {
      name: "description",
      type: "input",
      message: "Description",
      default: ""
    },
    {
      name: "author",
      type: "input",
      message: "Author",
      default: ""
    }
  ]);

  // destination folder
  const destination = path.join(process.cwd(), folder);
  await mkdirp(destination);

  // template files to copy
  const template = path.join(__dirname, "..", "template");
  const files = await globby(template, { dot: true });

  console.log("Copying files");

  // copy the template files over
  const promises = series(files, async file => {
    const relativePath = path.relative(template, file);
    const fileDestination = path.join(destination, relativePath);
    const directory = path.parse(fileDestination).dir;
    await mkdirp(directory);
    const templateFile = handlebars.compile(fs.readFileSync(file, "utf8"));
    console.log(file);
    fs.writeFileSync(
      fileDestination,
      templateFile({
        manager,
        ...info
      }),
      "utf8"
    );
  });

  ora.promise(promises);
  await promises;

  // create gitignore
  const gitIgnorePath = path.join(destination, ".gitignore");

  fs.writeFileSync(
    gitIgnorePath,
    `
node_modules
build
dist
.rpt2_cache
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
    `,
    "utf8"
  );

  console.log(`
    Right on! Your library has been created in ${destination}.

    To get started: 
      
      Enter the newly created directory
      ${chalk.blue(`cd ${folder}`)}

      Install the dependencies
      ${chalk.blue(`${manager}`)}

      Run storybook
      ${chalk.blue(`${manager} run storybook`)}

  `);
}

module.exports = cli;
