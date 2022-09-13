// HolyC Fibonacci
U0
Fibonacci()
{
	U32 a = 0, b = 1, c, i;

	for (i = 0; i < 20; i++)
	{
		c = a + b;
		"%d\n", c;
		a = b;
		b = c;
	}
}

Fibonacci;