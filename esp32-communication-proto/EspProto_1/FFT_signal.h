#define SAMPLE_SIZE 1024 // Must be a power of 2
#define TOTAL_TIME 9.391904 //The time in which data was captured. This is equal to /sampling_freq
#define FFT_N_TEST 16

float fft_input[SAMPLE_SIZE];
float fft_output[SAMPLE_SIZE];

float max_magnitude = 0;
float fundamental_freq = 0;


/* Dummy data (Output of an accelerometer)
 * Frequency: 5 Hz
 * Amplitude: 0.25g
*/
float fft_signal[SAMPLE_SIZE];
