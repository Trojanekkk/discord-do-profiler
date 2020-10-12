import sys
import time

import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt

x = sys.argv[1].split(',')
y = list(map(int, sys.argv[2].replace('.', '').split(',')))

figname = "charts/" + str(time.perf_counter()).replace('.', '') + ".png"

plt.plot(x, y)
plt.xlabel("Zakres dat")
plt.ylabel("Ranga")
plt.savefig(figname)

print(figname)

sys.stdout.flush()