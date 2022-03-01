import {readFileSync, unlinkSync} from "fs";
import {basename, join} from "path";
import {execFile} from "child_process";

const proxyBuilder = (filename: string) => `
export default gobridge(fetch('${filename}').then(response => response.arrayBuffer()));
`;

const getGoBin = (root: string) => `${root}/bin/go`;

function loader(content: string) {
  const callback = this.async();

  const opts = {
    env: {
      GOPATH: process.env.GOPATH,
      GOROOT: process.env.GOROOT,
      GOCACHE: join(__dirname, "./.gocache"),
      GOOS: "js",
      GOARCH: "wasm"
    },
    cwd: 'wasm',
  };

  const goBin = getGoBin(opts.env.GOROOT);
  const outFile = `${this.resourcePath}.wasm`;
  const args = ["build", "-o", outFile, this.resourcePath];

  execFile(goBin, args, opts, (err) => {
    if (err) {
      callback(err);
      return;
    }

    let out = readFileSync(outFile);
    unlinkSync(outFile);
    const emittedFilename = basename(this.resourcePath, ".go") + ".wasm";
    this.emitFile(emittedFilename, out, null);

    callback(
      null,
      [
        "require('!",
        join(__dirname, "..", "lib", "wasm_exec.js"),
        "');",
        "import gobridge from '",
        join(__dirname, "..", "dist", "gobridge.js"),
        "';",
        proxyBuilder(emittedFilename)
      ].join("")
    );
  });
}

export default loader;
