with import <nixpkgs> {};

let
  script = pkgs.writeShellScriptBin "start" 
  ''
    steam-run $(which bun) dev
  '';
in
  stdenv.mkDerivation {
    name = "nix-server-environment";
    
    buildInputs = [
      script
    ];
  }