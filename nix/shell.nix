with import <nixpkgs> {};

let
  script = pkgs.writeShellScriptBin "start" 
  ''
    steam-run $(which bun) dev
  '';
in
  stdenv.mkShell {
    name = "nix-holy-interpreter-environment";
    version = "1.0.0";
    
    nativeBuildInputs = [
      bun

      script
    ];
  }