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
    fs.writeFileSync(
      fileDestination,
      templateFile({
        ...info
      }),
      "utf8"
    );
  });

  ora.promise(promises);
  await promises;

  console.log(`
    Your project has been created in ${destination}.
    To get started run: ${chalk.blue(
      `cd ${folder} && yarn && yarn run storybook`
    )}
  `);
}

module.exports = cli;
