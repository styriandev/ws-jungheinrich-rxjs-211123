import { jestMatcher } from './marbles/jest.observable-matcher';
import { TestScheduler } from 'rxjs/testing';

describe('coalesceWith', () => {

    let testScheduler: TestScheduler;

    beforeEach(() => {
        testScheduler = new TestScheduler(jestMatcher);
    });

    it('should emit last value if source completes before durationSelector', () => {
        testScheduler.run(({}) => {

        });
    });

    it('should emit last value if source completes before durationSelector', () => {
        testScheduler.run(({}) => {

        });
    });

    it('should emit last for sync values when durationSelector is a Promise', () => {
        testScheduler.run(({}) => {

        });
    });

    it('should forward errors', () => {
        testScheduler.run(({}) => {

        });
    });
});
