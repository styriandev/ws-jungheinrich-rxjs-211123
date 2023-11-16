# Data fetching with switchMap

# Goal

We want to deepen our knowledge about higher order observables, especially how to refactor nested subscriptions into a single stream of events.
By using the `async` pipe in the template, we also get rid of the subscription management in our component.


## Improve fetch movies with switchMap

Currently, data fetching is being made with nested subscriptions. Nested subscriptions are hard to read and always are solvable with one of the higher order observable operators.
In our case, as we are handling data fetching on navigation, `switchMap` is the tool of choice.

First, validate the initial state. Navigate back-and-forth between different categories of movies and observe the network tab by filtering for `xhr` requests.
You should see 1 newly added request per route switch. If you also add network throttling to it & disable cache, you will notice that all requests are processed, regardless
if the results are used or not.

![requests-not-cancelled.png](images%2Frequests-not-cancelled.png)

As a first step, refactor the currently nested subscriptions in the `MovieListPageComponent` to a single stream by using the `switchMap` operator.

<details>
  <summary>MovieListPageComponent refactor nested subscriptions</summary>

```ts

// movie-list-page.component.ts

 this.activatedRoute.params.pipe(
     switchMap(params => {
       if (params['category']) {
         return this.movieService.getMovieList(params['category']);
       } else {
         return this.movieService.getMoviesByGenre(params['id']);
       }
    })
 ).subscribe(movies => this.movies = movies);

```

</details>

Cool, run your application and repeat the process from before. You should see that requests that are inflight and not needed, get properly aborted.

![cancelled-requests.png](images%2Fcancelled-requests.png)

## Subscription handling in template

Next, we want to get rid of the manual subscription in our component and instead letting the template handle our subscription automatically.
Create a `movie$` Observable. It should just be the stream of movies without the subscription.

<details>
  <summary>MovieListPageComponent movie$</summary>

```ts

// movie-list-page.component.ts

movie$ = this.activatedRoute.params.pipe(
     switchMap(params => {
       if (params['category']) {
         return this.movieService.getMovieList(params['category']);
       } else {
         return this.movieService.getMoviesByGenre(params['id']);
       }
    })
 );

```

</details>

Now refactor your template to consume the newly created Observable. You can use the ngIf-async-hack: `*ngIf="movie$ | async as movies`.

<details>
  <summary>MovieListPageComponent movie$ | async</summary>

```html

<!-- movie-list-page.component.html -->

<ng-container *ngIf="movies$ | async as movies">
  
  <!-- The template code -->
  
</ng-container>

```

</details>

Run the application and navigate between different movie categories. Validate everything is working as expected.

## Loading Indicator

Currently, users with bad network conditions will have a hard time understanding if the application is in a frozen or
a processing state. Let's implement some user feedback whenever we start loading new movies.

The idea is simple. We just have to make sure to display a loading template whenever the list of movies is empty.

Let's implement the template part first.

There is already a pre-built loading spinner available, insert a `div.loader` to show it.

<details>
  <summary>Show Loading Indicator when movies are empty</summary>

```html

<!-- movie-list-page.component.html -->

<ng-container *ngIf="movies$ | async as movies; else: loader">
  
  <!-- The template code -->
  
</ng-container>

<ng-template #loader>
  <div class="loader"></div>
</ng-template>

```

</details>

Serve your application, you should notice that a loading spinner appears on initial load, but not when switching between movie categories.

Let's go ahead and fix that as well.

We want to return an `undefined` value whenever we receive new routeParams to make sure the condition in our template is true on route changes.

Please use either `concat` or `startWith` in order to first emit an undefined value before fetching the movies.

<details>
  <summary>Show loader on route switch</summary>

```ts

// movie-list-page.component.ts

movie$ = this.activatedRoute.params.pipe(
     switchMap(params => {
       if (params['category']) {
         return this.movieService.getMovieList(params['category']).pipe(
             startWith(undefined)
         );
       } else {
         return this.movieService.getMoviesByGenre(params['id']).pipe(
             startWith(undefined)
         );
       }
    })
 );

```

</details>

Serve your application, you should now notice that a loading spinner appears on initial load and on route changes as well.
