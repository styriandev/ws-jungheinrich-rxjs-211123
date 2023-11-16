# SwitchMap Exercise

# Goal

We want to deepen our knowledge about higher order observables, especially how to refactor nested subscriptions into a single stream of events.
By using the `async` pipe in the template, we also get rid of the subscription management in our component.


## Improve fetch movies with switchMap

Currently, data fetching is being made with nested subscriptions. Nested subscriptions are hard to read and always are solvable with one of the higher order observable operators.
In our case, as we are handling data fetching on navigation, `switchMap` is the tool of choice.

First, validate the initial state. Navigate back-and-forth between different categories of movies and observe the network tab by filtering for `xhr` requests.
You should see 1 newly added request per route switch. If you also add network throttling to it & disable cache, you will notice that all requests are processed, regardless
if the results are used or not.

As a first step, refactor the currently nested subscriptions in the `MovieListPageComponent` to a single stream by using the `switchMap` operator.

<details>
  <summary>MovieListPageComponent refactor nested subscriptions</summary>

```ts

// movie-list-page.component.ts

 this.activatedRoute.params.pipe(switchMap(params => {
   if (params['category']) {
     this.movieService.getMovieList(params['category']).subscribe(
       movies => this.movies = movies
     )
   } else {
     this.movieService.getMoviesByGenre(params['id']).subscribe(
       movies => this.movies = movies
     );
   }
}));

```

</details>

