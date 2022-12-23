#ifndef Test_h
#define Test_h
#include <Arduino.h>
#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
class Test{
    public:
    // global variable of samples
        float samples[1024];
        long valuesFFT[1024];
        Test();
        void clearFFT();
        int addTwoInts();
        void dittt();
    private:
};
#endif
