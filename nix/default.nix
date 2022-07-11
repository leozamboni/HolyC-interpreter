# nix-shell nix
# start
with import <nixpkgs> {};

let
  script = pkgs.writeShellScriptBin "start" 
  ''
    python -m http.server 8000
  '';
in
  stdenv.mkDerivation {
    name = "nix-server-environment";
    
    buildInputs = [
      script
      python3
    ];
  }