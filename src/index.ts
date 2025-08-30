import { _ } from 'lodash';
import { LogService } from './services/log.service';


import '@webcomponents/custom-elements/src/native-shim';
import { Framework } from './lib';
import { Counter } from './components/counter/counter';
import { Button } from './components/button/button';
import { Simpleform } from './components/simpleform/simpleform';
import { Modal } from './components/modal/modal';
import { ModalDemo } from './components/modal-demo/modal-demo';
import { List } from './components/list/list';


const app = new Framework();
app.registerComponents([Button, Counter, Simpleform, Modal, ModalDemo, List]);


const logger = new LogService('foo');

logger.debug('fooo');
