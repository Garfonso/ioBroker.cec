![Logo](admin/cec.png)
# ioBroker.cec
=============================

Adapter for HDMI CEC

## Info
Early alpha release, just now only working on Raspberry Pi.

## Requirements
cec-client have to be installed. Install the client from [here] (https://github.com/Pulse-Eight/libcec) 
and follow the install instruction in the [readme] (https://github.com/Pulse-Eight/libcec/blob/master/README.md) of the libcec project.
The readme has a special section for the Raspberry Pi.

Or you can try this simple [script] (/install-libcec.sh/) as root.

## Installation
Execute the following command in the iobroker root directory (e.g. in /opt/iobroker)
```
npm install iobroker.ece 
```
## Changelog
### 0.0.3 (2018.07.xx)
* (garfonso) done something 

## License
The MIT License (MIT)

Copyright (c) 2016 soef <soef@gmx.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
