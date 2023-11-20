# Custom State Management Solution w/ rxjs

# Goal

Combination of all learned concepts to create an abstract custom state management solution.

* higher order observables
* join operators
* multicasting
* side effects
* subscription handling

Up until now, we've treated state as single observable slices. While it is effective for now, it won't be able to scale and is hard to maintain.
We have to manually maintain subscriptions, have high refactoring efforts when changing the behavior of single slices & you can't interact imperatively with your state, to name a few issues.

In a perfect world, our reactive state management is:

* tied to the component lifecycle
* manages subscriptions internally
* easy to construct
* lazy by default -> doesn't require an initial state
* read & write operations reactive as well as imperative
* easy to derive state from stored slices
* is able to manage side effects

And this is exactly what we want to build now (as a baby version of course). You could call it BehaviorSubject on steroids.

## Custom Reactive State Management

Take a look at the following interface, this is what we are going to build now. It describes the interface of a generic local state
class that acts as a reactive key-value store.

```ts

type ReactiveState<T> = {
  
  // imperative
  // read
  get(): Partial<T>;
  get<K extends keyof T>(key: K): T[K];
  // write
  set(partial: T): void;
  
  // reactive
  // read
  select(): Observable<T>;
  select<K extends keyof T>(key: K): Observable<T[K]>;
  select<R>(op: OperatorFunction<T, R>): Observable<R>;
  
  // write
  connect(slice$: Observable<Partial<T>>)
  connect<K extends keyof T>(key: K, slice$: Observable<T[K]>)
  
  // side-effects
  hold(effect$: Observable<unknown>): void;

}
```

### The Skeleton

First, let's build the skeleton. We need to create a new service class that is a non-provided `@Injectable` as we want to provide it
with each component.

<details>
  <summary>Skeleton Implementation</summary>

```ts
// state.service.ts

@Injectable() // locally provided token
export class StateService<T> {


}

```

</details>

### The Reactive Core & Subscription Management

Now we can start building the reactive core and the subscription management.

We need:

* a property `state: T` for the imperative access
* a Subject `slices$: Subject<Observable<Partial<T>> | Partial<T>>`
  * --> this is where inputs (single slices via connect & set) from the outside land
* the composed `state$: Observable<T>`
  * --> this is the composed state, a combination of all slices
  * coerces the value to an observable (use `coerceObservable` from `@rx-angular/cdk/coercing`)
  * merges all incoming slices
  * combines (scan) the value into a single key-value pair

Finally, we need to subscribe to `state$` to activate it.
Don't forget to use `takeUntilDestroyed` to unsubscribe on destruction.

<details>
  <summary>The reactive core</summary>

```ts
// state.service.ts

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { coerceObservable } from '@rx-angular/cdk/coercing';

class ReactiveState<T> {
  
  private slices$ = new Subject<Partial<T> | Observable<Partial<T>>>();
  
  // for imperative access
  private state: Partial<T> = {};
  
  // for reactive access
  private state$ = this.slices$.pipe(
    map(coerceObservable),
    mergeAll(),
    scan((state, slice) => ({
      ...state,
      ...slice
    }), {} as T),
    tap(s => state = s)
  );
}
```

</details>

### Select, Get

Now that the reactive is core is here, we can use it to expose our data imperatively as well as reactively.

<details>
  <summary>Select implementation</summary>

```ts
// state.service.ts
class ReactiveState<T> {
  
  select(): Observable<T>;
  select<K extends keyof T>(key: K): Observable<T[K]>;
  select<R>(sliceOrKey ?: OperatorFunction<T, R>) {
    if (!sliceOrKey) {
      return this.state$;
    } else if (typeof sliceOrKey === 'function') {
      return this.state$.pipe(sliceOrKey);
    }
    return this.state$.pipe(map(state => state[sliceOrKey]));
  }

}
```

</details>

<details>
  <summary>Get implementation</summary>

```ts
// state.service.ts

class ReactiveState<T> {
  
  get(): Partial<T>;
  get<K extends keyof T>(key: K): T[K];
  get<K extends keyof T>(k ?: K): Partial<T> | T[K] {
    if (k) {
      return this.state[k];
    }
    return this.state;
  }

}
```

</details>

### Connect, Set

Now that the reactive is core is here, we can use it to feed it with our users inputs imperatively as well as reactively.

<details>
  <summary>Connect implementation</summary>

```ts
// state.service.ts

class ReactiveState<T> {
  
  connect(slice$: Observable<Partial<T>>)
  connect<K extends keyof T>(key: K, slice$: Observable<T[K]>)
  connect<K extends keyof T>(keyOrSlice: K | Observable<Partial<T>>, keySlice$ ?: Observable<T[K]>) {
    if (keySlice$) {
      this.slices$.next(keySlice$.pipe(
        map(keySlice => ({ [keyOrSlice as K]: keySlice } as unknown as Partial<T>))
      ))
    } else {
      this.slices$.next(keyOrSlice as Observable<Partial<T>>);
    }
  }

}
```

</details>

<details>
  <summary>Set implementation</summary>

```ts
// state.service.ts

class ReactiveState<T> {
  
  set(slice: Partial<T>) {
    this.slices$.next(slice);
  }
}
```

</details>

### Side Effects

The side effect handling happens completely separated from the state logic.
To handle observable side effects, we need another higher order observable that resembles
a stream of all side effect streams, `effect$: Subject<Observable<unknown>>`.

We also want to implement a public function `hold` that accepts `Observable<unknown>` and feeds
`effect$` with values.

The last part is to implement the execution of the side effects by merging all effects.

<details>
  <summary>Side Effects Handling</summary>

```ts
// state.service.ts

class ReactiveState<T> {
  
  private effects$ = new Subject<Observable<unknown>>();
  
  constructor() {
    /**/
    this.effects$.pipe(mergeAll(), takeUntilDestroyed()).subscribe()
  }
  
  hold(effect$: Observable<unknown>) {
    this.effects$.next(effect$);
  }

}
```

</details>

### Multicasting: Choose your fighter

Our state is still cold, so let's make it hot & replaying. Introduce any form multicasting + replayability you want.

<details>
  <summary>Multicasted State</summary>

```ts
// state.service.ts

class ReactiveState<T> {
  private state$ = connectable(
    this.slices$.pipe(
      map(coerceObservable),
      mergeAll(),
      scan((state, slice) => ({
        ...state,
        ...slice
      }), {} as T),
    ),
    {
      connector: () => new ReplaySubject(1),
    }
  );
  
  constructor() {
    this.state$.connect();
  }
}
```

</details>

### Cleanup

The final missing piece is to clean up whenever our local service is destroyed. I suggest injecting the `DestroyRef` to use
it's `onDestroy` hook to unsubscribe from the state subscription.

<details>
  <summary>Multicasted State</summary>

```ts
// state.service.ts

import { DestroyRef } from '@angular/core';

class ReactiveState<T> {
  
  constructor() {
    const stateSub = this.state$.connect();
    
    inject(DestroyRef).onDestroy(() => {
      stateSub.unsubscribe();
    })
  }
}
```

</details>

Congratulations, you have successfully implemented a baby-version of a really useful state management tool that will make your life easier :).

### Application

As your abstract state management solution is now ready to be used, go ahead and refactor the `MovieListPageComponent` to use your implementation.

#### Provide & Inject the Service

Provide an instance of the `ReactiveState` token & inject it in the component.

The interface for the state should be

```ts
{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}
```

<details>
  <summary>ReactiveState Provider</summary>

```ts
// movie-list-page.component.ts

@Component({
  /**/,
  providers:
[ReactiveState]
})

export class MovieListPageComponent {
  private state = inject<ReactiveState<{
    favorites: Record<string, MovieModel>;
    favoritesLoading: Record<string, boolean>;
    movies: TMDBMovieModel[];
  }>>(ReactiveState);
}
```

</details>

#### Set initial State

The first thing you want to do is setting an initial state of

```ts
{
  favoritesLoading: {}
,
  favorites: {}
,
}
```

<details>
  <summary>Initial State</summary>

```ts
// movie-list-page.component.ts

constructor()
{
  this.state.set({
    favoritesLoading: {},
    favorites: {},
  });
}
```

</details>

#### Connect movies & favorites

Now we can start populating our state with values.
Go ahead to connect the paginated movie$ stream to the `movie` key of your state.
Also, instead of having a `favoritesMap$: BehaviorSubject`, populate the `favorites` key of your state with
the `movieService.favoriteMovies()` observable.

<details>
  <summary>Connect Movie</summary>

```ts
// movie-list-page.component.ts

constructor()
{
  /**/
  this.state.connect(
    'movies',
    this.activatedRoute.params.pipe(
      switchMap(params => {
        if (params['category']) {
          return this.paginate((page) =>
            this.movieService.getMovieList(params['category'], page)
          );
        } else {
          return this.paginate((page) =>
            this.movieService.getMoviesByGenre(params['id'], page)
          );
        }
      })
    )
  );
  
  this.state.connect('favorites', this.movieService.getFavoriteMovies().pipe(
    map(favorites => toDictionary(favorites, 'id'))
  ));
}
```

</details>

#### Handle Updates & favoritesLoading

The final piece of state connection is the favoritesLoadingMap. By looking at the subscription from before, you will notice
we are updating two different subjects: `favoritesLoadingMap$` and `favoritesMap$`.
Instead of connecting a single key, we now want to connect the slice `{ favorites, favoritesLoading }`.


<details>
  <summary>Handle Updates & favoritesLoading</summary>

```ts
// movie-list-page.component.ts

constructor()
{
  /**/
  this.state.connect(
    this.toggleFavorite$.pipe(
      groupBy(movie => movie.id),
      mergeMap(movie$ => {
        return movie$.pipe(
          exhaustMap(movie => {
            return this.movieService.toggleFavorite(movie).pipe(
              map(isFavorite => {
                const favoritesLoading = { ...this.state.get().favoritesLoading, [movie.id]: false };
                if (isFavorite) {
                  return {
                    favoritesLoading,
                    favorites: {
                      ...this.state.get().favorites,
                      [movie.id]: movie
                    }
                  };
                }
                const favoriteMap = {
                  ...this.state.get().favorites
                };
                delete favoriteMap[movie.id];
                return {
                  favorites: favoriteMap,
                  favoritesLoading: { ...this.state.get().favoritesLoading, [movie.id]: false }
                };
              }),
              startWith({
                favoritesLoading: { ...this.state.get().favoritesLoading, [movie.id]: true }
              })
            );
          })
        );
      })
    )
  );
}
```

</details>

#### Register Side Effect

We can also use the `hold` method in order to register our side alerting side effect.

<details>

  <summary>Register alert side effect</summary>

```ts
// movie-list-page.component.ts

constructor() {
  this.state.register(
    this.toggleFavorite$.pipe(
      groupBy(movie => movie.id),
      mergeMap(movie$ => movie$.pipe(
        exhaustMap(
          movie => this.state.select('favoritesLoading').pipe(
            filter(favoritesLoading => !favoritesLoading[movie.id]),
            tap(() => alert('movie updated')),
            take(1)
          )
        )
      )),
    )
  );
}

```
</details>

#### Read from state

And finally we can remove all of the `BehaviorSubjects` and replace our reads with the `select` API of our reactive state implementation.

<details>
  <summary>Read from state with select</summary>

```ts
// movie-list-page.component.ts

readonly movies$ = this.state.select('movies');
readonly favoritesMap$ = this.state.select('favorites');
readonly favoritesLoadingMap$ = this.state.select('favoritesLoading');

```
</details>

AMAZING!!!! Run your application and see if everything is working as expected.

We didn't put any new "feature" into the application, but I hope you can feel and experience the improved developer experience
when managing reactive component states.

## Bonus: RxState

As stated before, we have implemented a baby-version of a production ready reactive state management tool.
Luckily, there is an actual battle tested and production ready version already available which shares basically the very same API as you have
implemented before.

If you like, you can go ahead and try out [`@rx-angular/state`](http://www.rx-angular.io/docs/state). You could use it the very same way as we implemented before, or you can also
try out the new functional API. You'll find an example below.

<details>
  <summary>use rxState</summary>

```ts

private state = rxState<{
  favorites: Record<string, MovieModel>;
  favoritesLoading: Record<string, boolean>;
  movies: TMDBMovieModel[];
}>(({ connect, get, set }) => {
  
  set({
    favoritesLoading: {},
    favorites: {},
  })
  
  // connect('movies', this.movies$);
  
  connect('favorites', this.movieService.getFavoriteMovies().pipe(
    map(favorites => toDictionary(favorites, 'id'))
  ));
  
  connect(
    this.toggleFavorite$.pipe(
      groupBy(movie => movie.id),
      mergeMap(movie$ => {
        return movie$.pipe(
          exhaustMap(movie => {
            return this.movieService.toggleFavorite(movie).pipe(
              map(isFavorite => {
                const favoritesLoading = { ...get('favoritesLoading'), [movie.id]: false };
                if (isFavorite) {
                  return {
                    favoritesLoading,
                    favorites: {
                      ...get('favorites'),
                      [movie.id]: movie
                    }
                  };
                }
                const favoriteMap = {
                  ...get('favorites')
                };
                delete favoriteMap[movie.id];
                return {
                  favorites: favoriteMap,
                  favoritesLoading: { ...get('favoritesLoading'), [movie.id]: false }
                };
              }),
              startWith({
                favoritesLoading: { ...get('favoritesLoading'), [movie.id]: true }
              })
            );
          })
        )
      })
    )
  )
})

readonly favoritesMap$ = this.state.select('favorites');
readonly favoritesLoadingMap$ = this.state.select('favoritesLoading');

```

</details>


