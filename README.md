# narr note (β)

Fast math note-taking tool with Tex notation for MacOSX.

All of the text/math/rect/line fragments are written with markdown notation but can be freely laid out graphically.

## Latest binary

[narr-note-0.1.0.dmg](https://github.com/miyosuda/narr-note/releases/download/v0.1.0/narr-note-0.1.0.dmg)


## How to put texts

| key          |                                              |
| ------       | -------------                                |
| ENTER        | add text input at the bottom of the last one |
| TAB          | add text input at the right of the last one  |
| ctrl+ENTER   | add display math text input                  |
| ctrl+TAB     | add display math text input                  |
| right click  | add text input                               |



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



###  Image
```
!(relative/path/to/image.png)

!(/absolute/path/to/image.png)
```

Images can be put with drag and drop.




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

#### Color example

```
[r]

{g}

--->r
```



## Shortcut


| key             | text                  |
| ----            | ----                  |
| ctrl+i ctrl+i   | $$                    |
| ctrl+m          | \\                    |
| ctrl+i ctrl+b   | \\mathbf{}            |
| ctrl+i ctrl+p   | \\partial             |
| command+1       | \\left(  \\right)     |
| command+2       | \\left\\{  \\right\\} |
| command+3       | \\left[  \\right]     |



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

#### MacOSX

```
$ node_modules/.bin/electron-builder --mac --x64
```

