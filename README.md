# RSSchool NodeJS websocket task template
> Static http server and base task packages. 
> By default WebSocket client tries to connect to the 3000 port.

## Installation
1. Clone/download repo
2. `npm install`

## Usage
**Development**

`npm run start:dev`

* App served @ `http://localhost:8181` with nodemon

**Production**

`npm run star:prod`

* App served @ `http://localhost:8181` without nodemon

---

**All commands**

Command | Description
--- | ---
`npm run start:dev` | Runs the application in development mode with nodemon.
`npm run start:prod` | Runs the application in production mode without nodemon.
`npm run format` | Formats the code in .ts files using Prettier.
`npm run lint` | Runs ESLint to check the syntax and code style in .ts files.

**Note**: replace `npm` with `yarn` in `package.json` if you use yarn.
