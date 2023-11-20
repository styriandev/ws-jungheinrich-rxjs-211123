import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { insert, remove } from '@rx-angular/cdk/transformations';
import { map, Observable, tap, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { TMDBMovieCreditsModel } from '../shared/model/movie-credits.model';
import { TMDBMovieDetailsModel } from '../shared/model/movie-details.model';
import { TMDBMovieGenreModel } from '../shared/model/movie-genre.model';
import { TMDBMovieModel } from '../shared/model/movie.model';
import { MovieModel } from './movie-model';

@Injectable({
  providedIn: 'root',
})
export class MovieService {
  constructor(private httpClient: HttpClient) {}

  getGenres(): Observable<TMDBMovieGenreModel[]> {
    return this.httpClient
      .get<{ genres: TMDBMovieGenreModel[] }>(
        `${environment.tmdbBaseUrl}/3/genre/movie/list`
      )
      .pipe(map(({ genres }) => genres));
  }

  getMoviesByGenre(
    genre: TMDBMovieGenreModel['id'],
    page = 1,
    sortBy = 'popularity.desc'
  ): Observable<TMDBMovieModel[]> {
    return this.httpClient
      .get<{ results: TMDBMovieModel[] }>(
        `${environment.tmdbBaseUrl}/3/discover/movie`,
        {
          params: {
            with_genres: genre,
            page,
            sort_by: sortBy,
          },
        }
      )
      .pipe(map(({ results }) => results));
  }

  getMovieCredits(id: string): Observable<TMDBMovieCreditsModel> {
    return this.httpClient.get<TMDBMovieCreditsModel>(
      `${environment.tmdbBaseUrl}/3/movie/${id}/credits`
    );
  }

  getMovieRecommendations(id: string): Observable<{ results: MovieModel[] }> {
    return this.httpClient.get<{ results: MovieModel[] }>(
      `${environment.tmdbBaseUrl}/3/movie/${id}/recommendations`
    );
  }

  getMovieById(id: string): Observable<TMDBMovieDetailsModel> {
    return this.httpClient.get<TMDBMovieDetailsModel>(
      `${environment.tmdbBaseUrl}/3/movie/${id}`
    );
  }

  getMovieList(
    category: string,
    page: number = 1,
    sortBy = 'popularity.desc'
  ): Observable<TMDBMovieModel[]> {
    const { tmdbBaseUrl: baseUrl } = environment;

    return this.httpClient
      .get<{ results: TMDBMovieModel[] }>(`${baseUrl}/3/movie/${category}`, {
        params: { page, sort_by: sortBy },
      })
      .pipe(map(({ results }) => results));
  }

  searchMovies(query: string): Observable<MovieModel[]> {
    return this.httpClient
      .get<{ results: MovieModel[] }>(
        `${environment.tmdbBaseUrl}/3/search/movie`,
        {
          params: { query },
        }
      )
      .pipe(
        tap(() => {
          if (query === 'throwError') {
            throw new Error('you searched for throwError, i am sorry');
          }
        }),
        map(({ results }) => results)
      );
  }

  getFavoriteMovies(): Observable<MovieModel[]> {
    console.log('requesting getFavoriteMovies')
    return timer(1500).pipe(
      map(() => this.getFavorites()),
      tap(() => console.log('requested getFavoriteMovies'))
    )
  }

  toggleFavorite(movie: MovieModel): Observable<boolean> {
    console.log('requesting toggleFavorite')
    return timer(1500).pipe(
      map(() => {
        console.log('requested toggleFavorite')
        if (this.getFavorites().find(f => f.id === movie.id)) {
          this.setFavorites(
            remove(this.getFavorites(), movie, 'id')
          );
          return false;
        } else {
          this.setFavorites(
            insert(this.getFavorites(), movie as MovieModel & { comment: string })
          );
          return true;
        }
      })
    )
  }

  getFavorites(): (MovieModel & { comment: string })[] {
    if (typeof localStorage === "undefined") return [];
    const movies = localStorage.getItem('my-movies');
    return movies ? JSON.parse(movies) : [];
  }

  setFavorites(movies: (MovieModel & { comment: string })[]) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem('my-movies', JSON.stringify(movies));
  }
}
