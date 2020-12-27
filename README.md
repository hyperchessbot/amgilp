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

`users`: comma separated list of usernames

response:

`status`: `ok` for success, error message otherwise

`records`: array of user records

## API - Toplist

endpoint: `/toplist`

method: `GET`

### url parameters

`page`: toplist page ( 100 records per page )

response:

`status`: `ok` for success, error message otherwise

`records`: array of toplist records

# honours

Based on and using the collected data of wonderful project https://github.com/kraktus/AreMyGamesInLichessPuzzles .
