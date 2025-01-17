const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supportedTypes = ['type', 'echo', 'exit'];

const handleEcho = (answer) => {
  let result = answer.slice(5);
  console.log(result);
}

const handleType = (answer) => {
  let builtin = answer.slice(5);
  if (supportedTypes.indexOf(builtin) > -1) {
    console.log(`${builtin} is a shell builtin`);
  }
  else {
    console.log(`${builtin}: not found`)
  }
}

const main = () => {
  rl.question('$ ', (answer) => {
    if (answer === 'exit 0') {
      rl.close();
      return;
    }

    if (answer.startsWith('echo ')) {
      handleEcho(answer);
    }
    else if (answer.startsWith('type ')) {
      handleType(answer);
    }
    else {
      console.log(`${answer}: command not found`);
    }
    main();
  });
}

main();