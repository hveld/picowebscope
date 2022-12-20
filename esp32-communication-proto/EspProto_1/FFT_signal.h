#define FFT_N 1024 // Must be a power of 2
#define TOTAL_TIME 9.391904 //The time in which data was captured. This is equal to FFT_N/sampling_freq
#define FFT_N_TEST 16

float fft_input[FFT_N];
float fft_output[FFT_N];

float max_magnitude = 0;
float fundamental_freq = 0;


/* Dummy data (Output of an accelerometer)
 * Frequency: 5 Hz
 * Amplitude: 0.25g
*/
float fft_signal[FFT_N];
