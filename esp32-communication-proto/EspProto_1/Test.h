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
        float valuesFFT[1024];
        Test();
        int addTwoInts();
        void dittt(float *data1);
    private:
};
#endif
