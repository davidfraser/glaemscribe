RENAME "1.0.0" "TengwarEldamarGlaemUnicode" "Tengwar Eldamar GlaemUnicode" "Tengwar Eldamar GlaemUnicode"

# remove strange unuseful chars notdef, null, nonmarkingreturn
D 0x10000

# Put everything aside
MB 0 0x5FFF 0x10000

# Put everything that's already in the unicode part (put by Mans) just before
MB 0xE000 0xE07F 0xD000

##############################

X _eldamar_partial.mod

###################################

# Put back remaining unused glyphs in a trash zone
MB 0x10000 0x15FFF 0x6000

# Copying zero to reversed_osse
C 0xE070 0xE030

# Copying parens to brackets
C 0x28 0x5B
C 0x29 0x5D

# Copying double quotes to unicode places
C 0xE06A 0x201D
C 0xE06B 0x201C
C 0xE06A 0x201F
C 0xE06B 0x201E

# Copying numerals to ascii places
C 0xE070 0x0030
C 0xE071 0x0031
C 0xE072 0x0032
C 0xE073 0x0033
C 0xE074 0x0034
C 0xE075 0x0035
C 0xE076 0x0036
C 0xE077 0x0037
C 0xE078 0x0038
C 0xE079 0x0039

# Copying double tild to ring mark spots
C 0xE069 0xE06E
C 0xE069 0xE06F