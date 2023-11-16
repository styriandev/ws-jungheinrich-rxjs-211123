# MergeMap & groupBy Exercise

# Goal

We want to display and manipulate the `favorite` state of a movie in the `MovieListPageComponent`.

## Fetch Favorite Movies

In order to display the favorite state of a movie, we need to fetch the favorite list from the `MovieService`. The `MovieList` already
expects an input of type `Record<string, MovieModel>`: A key-value map indicating if a movie is a favorite or not.

In a first step, let's create a `BehaviorSubject<Record<string, MovieModel>>` which acts as our state for the favorite movies. We want to fill
it with the data coming from the `getFavoriteMovies()` API from the `MovieService`.


<details>
  <summary>Fetch Favorite Movies and transform into dictionary</summary>

```ts
// movie-list-page.component.ts

readonly favoritesMap$ = new BehaviorSubject<Record<string, MovieModel>>({});


this.movieService.getFavoriteMovies().subscribe(favorites => {
  this.favoritesMap$.next(toDictionary(favorites, 'id'))
});
```

</details>

Cool, you can inspect the console and see if the call is being made. Note, that this is not a real http call, it's just a delay ;).

Now adjust the template so that the favorite movies can be displayed properly

<details>
  <summary>Pass favorite data to template</summary>

```html
<!-- movie-list-page.component.html-->

<movie-list
  [favorites]="favoritesMap$ | async"
  *ngIf="movies && movies.length > 0; else: elseTmpl"
  [movies]="movies">
</movie-list>
```

</details>


## Toggle Favorite Movie State

As for now, the favorite state is read only. Let's implement functionality to let users also update the favorite state.
We need to add two things to make it happen, a trigger that kicks off the update process and a subscription that updates the value
at service level as well as the local state for displaying purposes.

Create a `new Subject<MovieModel>();` as a trigger.
As a final piece, we want to subscribe to the trigger and call the `toggleFavorite()` method of the `MovieService`. As soon as the callback
returns a result, we update our local `favoritesMap$` to reflect the state change.

> `toggleFavorite()` returns a boolean indicating if the given movie was added or removed from the favorites.

As the updates for the list items should not abort or wait on each other, we want to make use of `mergeMap` to let all triggered events
run in parallel.

<details>
  <summary>MovieListPageComponent</summary>

```ts

// movie-list-page.component.ts

readonly favoritesMap$ = new BehaviorSubject<Record<string, MovieModel>>({});


this.toggleFavorite$.pipe(
  mergeMap(movie => this.movieService.toggleFavorite(movie).pipe(
    /* compute new favorites based on the result */
    /* use `insert` for inserting from @rx-angular/cdk/transformations */
    /* if you need help, take a look at the next help block */
  ))
).subscribe(favorites => this.favoritesMap$.next(favorites))
```

</details>

<details>
  <summary>Transformation of toggleFavorite Result</summary>

This is the transformation function to build the new favoritesMap after receiving the update from the MovieService

```ts

map(isFavorite => {
    if (isFavorite) {
      return {
        ...this.favoritesMap$.getValue(),
        [movie.id]: movie
      }
    }
    const favoriteMap = {
      ...this.favoritesMap$.getValue()
    };
    delete favoriteMap[movie.id];
    return favoriteMap;
  })

```
</details>

You also need to call the trigger from the template.

<details>
  <summary>call trigger from template</summary>

```html
<!-- movie-list-page.component.html-->

<movie-list
  [favorites]="favoritesMap$ | async"
  (favoriteToggled)="toggleFavorite$.next($event)"
  *ngIf="movies && movies.length > 0; else: elseTmpl"
  [movies]="movies">
</movie-list>
```

</details>

Nice, run the application and test out your result :).

## Group Updates by movie ID

As you've probably noticed, rage clicking the favorite state results in extreme weird behavior. What we want to achieve next is that we omit consequent
updates if a request is currently in flight - per movie.

To achieve this we want to use a combination of `groupBy` & `exhaustMap`. 

<details>
  <summary>Group & Exhaust update requests</summary>

```ts

// movie-list-page.component.ts

/* group the updates by movieId and exhaustMap each of them to the toggleFavorite request */
groupBy(movie => movie.id),
mergeMap(movie$ => {
  return movie$.pipe(
    exhaustMap(movie => /* old update logic */)
  )
})
```


</details>

<details>
  <summary>Group & Exhaust update requests: Full solution</summary>

```ts

// movie-list-page.component.ts

this.toggleFavorite$.pipe(
  groupBy(movie => movie.id),
  mergeMap(movie$ => {
    return movie$.pipe(
      exhaustMap(movie => this.movieService.toggleFavorite(movie).pipe(
        map(isFavorite => {
          if (isFavorite) {
            return {
              ...this.favoritesMap$.getValue(),
              [movie.id]: movie
            }
          }
          const favoriteMap = {
            ...this.favoritesMap$.getValue()
          };
          delete favoriteMap[movie.id];
          return favoriteMap;
        })
      ))
    )
  })
).subscribe(favorites => this.favoritesMap$.next(favorites));
```

</details>

Great, open the app again and try rage clicking :-D.

## Show Loading Indicator while update is ongoing

Finally, we also want to give users an idea about that something is actually going on instead of just blocking their rage click attempts.

For fast read access, we again want to create a key-value pair of string to boolean for the loading states of our movie cards.

Create a `favoritesLoadingMap$: BehaviorSubject<Record<string, boolean>>` which acts as state for our loadingMap.

Now, fill the map accordingly whenever an update process starts and when it finishes.

<details>
  <summary>Group & Exhaust update requests: Full solution</summary>

```ts

// movie-list-page.component.ts

this.toggleFavorite$.pipe(
  groupBy(movie => movie.id),
  mergeMap(movie$ => {
    return movie$.pipe(
      exhaustMap(movie => {
        this.favoritesLoadingMap$.next(
          {...this.favoritesLoadingMap$.getValue(), [movie.id]: true }
        );
          
        /* ... when the call finished */
        
        this.favoritesLoadingMap$.next({...this.favoritesLoadingMap$.getValue(), [movie.id]: false});
      })
    )
  })
).subscribe(favorites => this.favoritesMap$.next(favorites));
```

</details>

Also bind the `favoritesLoadingMap$` in the template.

<details>
  <summary>bind favoritesLoadingMap$ to template</summary>

```html
<!-- movie-list-page.component.html-->

<movie-list
  [favorites]="favoritesMap$ | async"
  [moviesLoading]="favoritesLoadingMap$ | async"
  (favoriteToggled)="toggleFavorite$.next($event)"
  *ngIf="movies && movies.length > 0; else: elseTmpl"
  [movies]="movies">
</movie-list>
```

</details>

Amazing, go ahead and use your newly built feature!
