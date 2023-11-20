import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TMDBMovieModel } from '../../shared/model/movie.model';
import { MovieService } from '../movie.service';
import { ElementVisibilityDirective } from '../../shared/cdk/element-visibility/element-visibility.directive';
import { MovieListComponent } from '../movie-list/movie-list.component';
import { NgIf, AsyncPipe } from '@angular/common';


@Component({
  selector: 'movie-list-page',
  templateUrl: './movie-list-page.component.html',
  styleUrls: ['./movie-list-page.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    MovieListComponent,
    ElementVisibilityDirective,
    AsyncPipe,
  ],
})
export class MovieListPageComponent {


  movies: TMDBMovieModel[];


  constructor(
    private activatedRoute: ActivatedRoute,
    private movieService: MovieService
  ) {

    this.activatedRoute.params.subscribe(params => {
      if (params['category']) {
        this.movieService.getMovieList(params['category']).subscribe(
          movies => this.movies = movies
        )
      } else {
        this.movieService.getMoviesByGenre(params['id']).subscribe(
          movies => this.movies = movies
        );
      }
    });
  }
}
