#include <avr/interrupt.h>
#include <avr/eeprom.h>
#include <util/delay.h>

#define BIT_SET(x, bit) ((x) & (1 << (bit)))

#define MS_IN_SECOND 1000.0

#define CHANNELS_COUNT 3
#define SERVO_PERIOD_MS 20.0
#define COMPA_FREQ_HZ 80000.0

#define COMPA_PERIOD_MS (MS_IN_SECOND / COMPA_FREQ_HZ)
#define COMPA_LOOP_COUNT (SERVO_PERIOD_MS / COMPA_PERIOD_MS)
#define MS_PULSE_MULTIPLIER (1.0 / COMPA_PERIOD_MS)
#define OCR_VALUE (F_CPU / COMPA_FREQ_HZ)

#define PULSE_RANGE 32

const uint16_t g_bounds[] = {
	0.20 * MS_PULSE_MULTIPLIER, 0.95 * MS_PULSE_MULTIPLIER,
	0.30 * MS_PULSE_MULTIPLIER, 0.85 * MS_PULSE_MULTIPLIER,
	0.37 * MS_PULSE_MULTIPLIER, 0.90 * MS_PULSE_MULTIPLIER,
};

uint16_t g_value[] = {0.59 * MS_PULSE_MULTIPLIER, 0.85 * MS_PULSE_MULTIPLIER, 0.37 * MS_PULSE_MULTIPLIER};
uint16_t g_target[] = {0.59 * MS_PULSE_MULTIPLIER, 0.85 * MS_PULSE_MULTIPLIER, 0.37 * MS_PULSE_MULTIPLIER};

uint8_t bound(const uint16_t min, const uint16_t value, const uint16_t max) {
	return value < min ? min : max < value ? max : value;
}

uint16_t compare_target(const uint8_t channel) {
	const uint16_t min = g_bounds[channel * 2];
	const uint16_t max = g_bounds[channel * 2 + 1];
	const uint16_t target = bound(min, g_target[channel], max);
	const uint16_t value = g_value[channel];
	return target < value ? -1 : target > value ? 1 : 0;
}

void move_to_target(void) {
	uint8_t channel = CHANNELS_COUNT;
	while (channel-- != 0) {
		g_value[channel] += compare_target(channel);
	}
}

ISR (TIMER0_COMPA_vect) {
	static uint16_t s_counter = 0;
	s_counter++;

	// this divider is a compromise between speed and accuracy
	const uint16_t magic_divider = 2;

	if (s_counter == COMPA_LOOP_COUNT / magic_divider) {
		s_counter = 0;
		PORTB = 0xFF;

		move_to_target();
	} else  {
		uint8_t channel = CHANNELS_COUNT;
		while (channel-- != 0) {
			if (s_counter == g_value[channel]) {
				PORTB &= ~_BV(channel);
			}
		}
	}
}

// -----------------------------------------------------------------------------
// initialization
// -----------------------------------------------------------------------------

void configure (void) {
	// DDB[2:0] = 111: output direction on pins PB0, PB1 and PB2
	DDRB = _BV(DDB2) | _BV(DDB1) | _BV(DDB0);

	// WGM0[2:0] = 010: clear timer on compare match (ctc) mode
	TCCR0A = _BV(WGM01);

	// CS0[2:0] = 001: timer/counter0 clock source is CLKio (no prescaling)
	TCCR0B = _BV(CS00);

	// OCIE0A = 1: timer/counter0 output compare match a interrupt enabled
	TIMSK = _BV(OCIE0A);

	// timer/counter0 compare value
	OCR0A = OCR_VALUE;

	// initial value of timer/counter0
	TCNT0 = 0;

	// enable interrupts globally
	sei();
}

void load_next_target(const uint8_t channel, const uint8_t target) {
	if (channel < CHANNELS_COUNT) {
		const uint16_t min = g_bounds[channel * 2];
		const uint16_t max = g_bounds[channel * 2 + 1];
		g_target[channel] = min + target * (max - min) / PULSE_RANGE;
	}
}

int main (void) {
	configure();

    while (1) {
		static uint8_t* pointer = 0;

		// each byte encodes servo, target for it and wait mode
		// bits 7-6 encodes servo number
		// bit 5 encodes wait mode (1 - do not wait, 0 - wait until previous targets reached)
		// bits 4-0 encodes position
		const uint8_t value = eeprom_read_byte(pointer);

		const uint8_t channel = value >> 6;
		const uint8_t target = value & (PULSE_RANGE - 1);
		const uint8_t skip_wait = BIT_SET(value, 5);

		if (skip_wait == 0) {
			uint8_t done = 1;

			{
				uint8_t channel = CHANNELS_COUNT;
				while (channel-- != 0) {
					if (compare_target(channel) != 0) {
						done = 0;
					}
				}
			}
			
			if (done == 1) {
				_delay_ms(10);
				load_next_target(channel, target);
				pointer++;
			}
		} else {
			load_next_target(channel, target);
			pointer++;
		}
    }
}
