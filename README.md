# amgilp

**Are my games in lichess puzzles ?**

Find the answer using this server application.

# API

API base url

```
https://amgilp.herokuapp.com/api
```

## API - Users

endpoint: `/users`

method: `GET`

### url parameters

`usernames`: comma separated list of usernames ( required )

response:

`status`: `ok` for success, error message otherwise

`records`: array of user records

example:

https://amgilp.herokuapp.com/api/users/?usernames=thibault,foytik

## API - Toplist

endpoint: `/toplist`

method: `GET`

### url parameters

`page`: toplist page ( 100 records per page ) ( optional, default = 1 )

response:

`status`: `ok` for success, error message otherwise

`records`: array of toplist records

example:

https://amgilp.herokuapp.com/api/toplist/?page=250

# honours

Based on and using the collected data of wonderful project https://github.com/kraktus/AreMyGamesInLichessPuzzles .
