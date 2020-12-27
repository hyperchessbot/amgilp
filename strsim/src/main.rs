extern crate strsim;

use strsim::{jaro_winkler};

fn main() {
    println!("{}", jaro_winkler("sakkozik", "sakkoz"));
}
