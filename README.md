# narr note

Fast math note taking tool with Tex notation for MacOSX.

All of the text/math/rect/line fragments are written with markdown notation, but can be freely layed out graphically.

## Grammar

### Text

| input  | type          |
| ------ | ------------- |
| $   $  | Inline math   |
| $$ $$  | Display math  |
| #      | H1 |
| ##     | H2 |
| ###    | H3 |
| ####   | H4 |
| #####  | H5 |


### Rectangle

| input | type           |
| ---- | ----            |
| []   | Rectangle       |
| {}   | Round rectangle |


### Line/Arrow

| input | type            |
| ----   | ----           |
| ---    | Line           |
| - - -  | Dashed line    |
| <--    | Arrow          |
| -->    | Arrow          |
| <->    | Arrow          |
| <- -   | Dashed arrow   |


### Color

Colors of the **rectangle** and **line** are specfied with color code.

| input | color   |
| ----  | ----    |
| r     | Red     |
| g     | Green   |
| b     | Blue    |
| c     | Cyan    |
| m     | Magenta |
| y     | Yellow  |
| k     | Black   |


#### Example

````
[r]

{g}

--->r
```


## Development

### Initial setup

```
$ npm install
```

### Debug

```
$ npm start
```

### Build

### MacOSX

```
$ node_modules/.bin/electron-builder --mac --x64
```
