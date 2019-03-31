#!/usr/bin/env node
"use strict";

const program = require("commander");
const inquirer = require("inquirer");
const mkdirp = require("make-dir");
const globby = require("globby");
const handlebars = require("handlebars");
const ora = require("ora");
const series = require("p-each-series");
const { version } = require("../package.json");

async function cli() {
  program
    .name("bento-builder")
    .version(version)
    .usage("[folder name]")
    .parse(process.argv);

  const folder = program.args[0];

  if (!folder) {
    console.error("A folder name is required");
    program.help();
    process.exit(1);
  }

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

  const destination = path.join(process.cwd, folder);
  await mkdirp(destination);

  const template = path.join(__dirname, "..", "template");

  const files = await globby(template, {
    dot: true
  });

  console.log("Copying files");

  const promises = series(files, async file => {
    const relativePath = path.relative(template, file);
    const fileDestination = path.join(destination, relativePath);
    const directory = path.parse(fileDestination).dir;
    await mkdirp(directory);
    const template = handlebars.compile(fs.readFileSync(file));
    fs.writeFileSync(
      fileDestination,
      template({
        ...info
      }),
      "utf8"
    );
  });

  ora.promise(promises);
  await promises;

  console.log(`
    Your project has been created in ${destination}.
    Get started: ${chalk.blue(`cd ${folder} && yarn && yarn run storybook`)}
  `);
}

module.exports = cli;
