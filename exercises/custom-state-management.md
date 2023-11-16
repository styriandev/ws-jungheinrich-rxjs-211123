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
* easy to derive state from store`d slices
* is able to manage side effects

And this is exactly what we want to build now (as a baby version of course). You could call it BehaviorSubject on steroids.

## Custom Reactive State Management

Take a look at the following interface, this is what we are going to build now. It describes the interface of a generic local state
class that acts as a reactive key-value store.

```ts

type LocalState<T> = {
  
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
  
  // write
  connect(slice$: Observable<Partial<T>>)
  connect<K extends keyof T>(key: K, slice$: Observable<T[K]>)
  
  // side-effects
  register(effect$: Observable<unknown>): void;

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

class LocalState<T> {
  
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
    }), {} as T)
  );
  
  constructor() {
    this.state$.pipe(
      takeUntilDestroyed()
    ).subscribe(state => this.state = state)
  
  }
}
```

</details>

### Select, Get

Now that the reactive is core is here, we can use it to expose our data imperatively as well as reactively.

<details>
  <summary>Select implementation</summary>

```ts
// state.service.ts
class LocalState<T> {
  
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

class LocalState<T> {
  
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

class LocalState<T> {
  
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

class LocalState<T> {
  
  set(slice: Partial<T>) {
    this.slices$.next(slice);
  }
}
```

</details>

### Side Effects

<details>
  <summary>Side Effects Handling</summary>

```ts
// state.service.ts

class LocalState<T> {
  
  private effects$ = new Subject<Observable<unknown>>();
  
  constructor() {
    /**/
    this.effects$.pipe(mergeAll(), takeUntilDestroyed()).subscribe()
  }
  
  register(effect$: Observable<unknown>) {
    this.effects$.next(effect$);
  }

}
```

</details>

Congratulations, you have successfully implemented a baby-version of a really useful state management tool that will make your life easier :).

### Application

<details>
  <summary>Side Effects Handling</summary>

```ts
// state.service.ts

class LocalState<T> {
  
  private effects$ = new Subject<Observable<unknown>>();
  
  constructor() {
    /**/
    this.effects$.pipe(mergeAll(), takeUntilDestroyed()).subscribe()
  }
  
  register(effect$: Observable<unknown>) {
    this.effects$.next(effect$);
  }
}
```

</details>

### Multicasting: Choose your fighter

<details>
  <summary>Multicasted State</summary>

```ts
// state.service.ts

class LocalState<T> {
  private state$ = this.slices$.pipe(
    map(coerceObservable),
    mergeAll(),
    scan((state, slice) => ({
      ...state,
      ...slice
    }), {} as T),
    /* ADD MULTICASTING HERE */
    share({
      connector: () => new ReplaySubject(1),
      resetOnRefCountZero: true
    })
  );
}
```

</details>

## Bonus: RxState

As stated before, we have implemented a baby-version of a production ready reactive state management tool.
Luckily, there is an actual battle tested and production ready version already available which shares basically the very same API as you have
implemented before.

If you like, you can go ahead an try out `@rx-angular/state`. You could use it the very same way as we implemented before, or you can also
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

readonly
favoritesMap$ = this.state.select('favorites');
readonly
favoritesLoadingMap$ = this.state.select('favoritesLoading');

```

</details>


