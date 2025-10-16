pragma circom 2.0.0;

/*This circuit template checks that c is the multiplication of a and b.*/  

template KnowFactorsOf33() {
    
    // private inputs
    signal input a;
    signal input b;

    // public output
    signal output c;

    // Compute and expose the product
    c <== a * b;

    // Constrain the product to be 33
    c === 33;
}


component main = KnowFactorsOf33();
