#!/usr/bin/python

import re
import sys
# "223.224.0.0","223.239.255.255","3755999232","3757047807","IN","India"

print "hello, world\n"

file = open("GeoIPCountryWhois.csv")

lineformat = re.compile("\"(\d+.\d+.\d+.\d+)\"\,\"(\d+.\d+.\d+.\d+)\",\"(\d+)\",\"(\d+)\".*")

#ipnum = 16777216*w + 65536*x + 256*y + z

searchVal = 16777216*long(sys.argv[1]) + 65536*long(sys.argv[2]) + 256*long(sys.argv[3]) + long(sys.argv[4])
print "searching for %d" % searchVal

for line in file:
	result = lineformat.match(line)
	if searchVal > long(result.group(3)) and searchVal < long(result.group(4)):
		print line