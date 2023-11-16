# Infinite Scrolling with exhaustMap

# Goal

We want to deepen our knowledge about higher order observables, by getting familiar with the `exhaustMap` operator.
We will use it in order to implement an infinite scroll solution that paginates http calls on scroll events.

## Infinite Scrolling

Our trigger is already implemented and ready to use. The `ElementVisibilityDirective` emits an event everytime it
is visible to the user, indicating we've reached the bottom of the list and we should start fetching a new page.

As we don't want to over-fetch or fetch multiple pages at once, `exhaustMap` is the operator of choice. It drops
consequent requests as long as we have a request inflight.

The infinite scrolling should be part of the `MovieListPageComponent`s movie fetching logic.

First, add a trigger that should kick off the pagination event. Create a local `paginate$: Subject<void>` and bind it
to the `(elementVisible)` output event of the `ElementVisibildityDirective`.

<details>
  <summary>MovieListPageComponent paginate$ trigger</summary>

```ts

// movie-list-page.component.ts

readonly paginate$ = new Subject<void>();

```

```html

<!-- movie-list-page.component.html -->

<movie-list
  *ngIf="movies && movies.length > 0; else: elseTmpl"
  [movies]="movies">
</movie-list>

<!-- use (elementVisible) here -->
<div (elementVisible)="paginate$.next()"></div>

```

</details>

Cool, now let's implement the actual pagination logic.
For our use case, please implement a function `paginate(requestFn: (page: number) => Observable<TMDBMovieModel[]>): Observable<TMDBMovieModel[]>`.
The `paginate` method should take a function that resolves a number input into `Observable<TMDBMovieModel[]>` as input.

This is required as our component is responsible for fetching data from different services, depending on the route we are at. The input
is the function to the service that passes the current page to fetch.


<details>
  <summary>paginate skeleton</summary>

```ts

// movie-list-page.component.ts


private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  /* implementation happens here */
}

```

</details>

You can already go ahead and use the pagination function where it should be. We want to replace the movie fetching
logic within the `movie$` Observable. Instead of returning the service call directly, we call the `paginate`
method and pass the function to it.

<details>
  <summary>paginate usage</summary>

```ts

// movie-list-page.component.ts


movies$ = this.activatedRoute.params.pipe(
    switchMap(params => {
      if (params['category']) {
        /* add paginate here 👇 */
        return this.paginate((page) =>
          this.movieService.getMovieList(params['category'], page)
        );
      } else {
        /* add paginate here 👇 */
        return this.paginate((page) =>
          this.movieService.getMoviesByGenre(params['id'], page)
        );
      }
    }
  )
);

```

</details>


Now, implement the core logic of the pagination. We want to subscribe to the `paginate$` trigger and `exhaustMap` to the
given `requestFn` input.

In order to accumulate the paged results into a single array, we can use a local cache.

<details>
  <summary>pagination core logic</summary>

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  // local array to store all movies
  let allMovies: TMDBMovieModel[] = [];
  return this.paginate$.pipe(
    exhaustMap((v, i) =>
      // call requestFn with the page parameter, use the index from `exhaustMap`
      // as the index is not 0 based
      requestFn(i + 1).pipe(
        map((movies) => [...allMovies, ...movies])
      )
    ),
    tap(movies => allMovies = movies)
  );
}

```

</details>

Open the movie list in your browser and see if your pagination is properly working.

.... You've probably noticed that the list is entirely empty. The reason for it is the `paginate$` Observable
is not emitting an initial event. Go ahead and introduce the `startWith(void 0)` operator in order to kick off
the pagination process immediately on subscription.


<details>
  <summary>pagination full solution</summary>

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  // local array to store all movies
  let allMovies: TMDBMovieModel[] = [];
  return this.paginate$.pipe(
    startWith(void 0),
    exhaustMap((v, i) =>
      // call requestFn with the page parameter, use the index from `exhaustMap`
      // as the index is not 0 based
      requestFn(i + 1).pipe(
        map((movies) => [...allMovies, ...movies])
      )
    ),
    tap(movies => allMovies = movies)
  );
}

```

</details>

## Bonus: Use scan instead of the local cache

Try and replace the local `allMovies` array with a cleaner solution by using the `scan` operator.

<details>
  <summary>paginate with scan</summary>

```ts

// movie-list-page.component.ts

private paginate(
  requestFn: (page: number) => Observable<TMDBMovieModel[]>
): Observable<TMDBMovieModel[]> {
  return this.paginate$.pipe(
    startWith(void 0),
    exhaustMap((v, i) => requestFn(i + 1)),
    scan((allMovies, movies) => ([
      ...allMovies,
      ...movies
    ]), [] as TMDBMovieModel[])
  );
}

```

</details>
