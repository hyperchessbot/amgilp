extern crate strsim;

use strsim::{jaro_winkler};

use std::{env, fs};

fn main() {	
	let arg = env::args().nth(1).unwrap();
	
	let usernames: Vec<String> = fs::read_to_string("usernames.txt")
        .unwrap()
        .split("\n")
        .map(|x| x.to_owned())
        .collect();
	
	let mut best_dist = 0.0;	
	
	let mut matches = vec![];
	
	for username in usernames {
		let dist = jaro_winkler(&arg, &username);
		
		if dist > best_dist {
			best_dist = dist;
			
			matches.push(username.clone());
		}
	}
	
	println!("{:?}", matches);
}
