with import <nixpkgs> {};

pkgs.mkShell {
  name = "nix-holy-interpreter-environment";
  version = "1.0.0";
  
  nativeBuildInputs = [
    bun
    minify
    script
  ];
}