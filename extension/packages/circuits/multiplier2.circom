pragma circom 2.0.0;

/*This circuit template checks that c is the multiplication of a and b.*/  

template Multiplier2 () {
    signal input a;
    signal input b;

    signal input c;
    signal output c_out;

    // enforce c_out is public = c
    c_out <== c;

    // constraint: a * b must equal the given c
    a * b === c;
}


component main = Multiplier2();
