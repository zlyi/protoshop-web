'use strict';

angular.module('toHELL')
  .controller('PackageEditCTRL', ['$scope', '$routeParams', '$http', '$document',
    'GLOBAL', 'sceneService', 'elementService', 'actionService',
    function ($scope, $routeParams, $http, $document, GLOBAL, sceneService, elementService, actionService) {
      /**
       * 存储当前的编辑状态
       * @var {Object}
       */
      $scope.editStat = {
        selectedScene: null,
        selectedElement: null,
        selectedAction: null,
        gotoSignStyle: {
          top: '',
          right: ''
        },
        gotoLineStyle: {
          width: '264px'
        },
        /**
         * 移动hotspot时的临时存储栈
         * @var hotspotStack
         * @private
         */
        hotspotStack: {
          hotspotMovingTarget: null,
          hotspotDom: null,
          hotspotMovingStart: {
            x: 0,
            y: 0
          },
          hotspotMovingOffset: {
            x: 0,
            y: 0
          },
          hotspotOldZindex: null
        },
        expanderStack: {
          expanderMovingTarget: null,
          expanderMovingStart: {
            x: 0,
            y: 0
          },
          expanderMovingOffset: {
            x: 0,
            y: 0
          },
          hotspotPos: {
            x: 0,
            y: 0
          },
          hotspot: {
            width: 0,
            height: 0
          },
          expanderIndex: null
        }
      };

      $scope.package = {};
      /**
       * 存储整个工程的实时状态
       * @var {Object} $scope.package
       */
     // $http.get('/api/package/' + $routeParams.pkgId + '.json')
     $http.get('/api/package/' + '1d9abf59bfade93c71fbb260b6dc7390.json')
      // $http.get(GLOBAL.apiHost + 'fetchProject/?appid=' + $routeParams.pkgId)
        .success(function (data) {
          $scope.package = data;
          sceneService.setPackage($scope.package);
          elementService.setPackage($scope.package);
          actionService.setPackage($scope.package);
        })
        .error(GLOBAL.errLogger);

      sceneService.setStat($scope.editStat);
      elementService.setStat($scope.editStat);
      actionService.setStat($scope.editStat);

      /**
       * 选中一个场景
       * @func selectScene
       * @param {Scene} scene - 被选中的场景
       */
      $scope.selectScene = function (scene) {
        sceneService.selectScene(scene);
        // 清除掉之前可能有的其他元素、动作选择
        elementService.deselectElement();
      };

      $scope.defaults = {
        sceneBackground: 'images/dummy-scene-thumb.png'
      };

      /**
       * 释放选中的场景。连带释放选中的元素。
       * @func deselectScene
       */
      $scope.deselectScene = function () {
        sceneService.deselectScene();
        elementService.deselectElement();
      };

      /**
       * 增加一个场景。增加的场景将在所有场景之后。
       * @func addScene
       * @return {Scene} 返回新增的场景对象
       */
      $scope.addScene = function () {
        return sceneService.addScene();
      };

      /**
       * 增加一个场景并插入在所给order之后。
       * @func insertScene
       * @param {number} lastOrder - 新场景所要跟随的order
       * @return {Scene} 返回新增的场景对象
       * @todo
       */
      // $scope.insertScene = function (lastOrder) {
      //   // TODO
      // };

      /**
       * 删除一个场景。如果不存在满足条件的场景，则操作无效。
       * @func removeScene
       * @param {Scene} scene - 所要删除的场景对象
       */
      $scope.removeScene = function (scene) {
        return sceneService.removeScene(scene);
      };

      /**
       * 增加一个hotspot元素
       * @func addHotspotElement
       */
      $scope.addHotspotElement = function () {
        elementService.addHotspotElement();
      };

      /**
       * 选中一个动作
       * @func selectAction
       * @param {Action} action 所要选中的动作对象
       */
      $scope.selectAction = function (action) {
        actionService.selectAction(action);
      };

      /**
       * 释放选中的动作。
       * @func deselectAction
       */
      $scope.deselectAction = function () {
        actionService.deselectAction();
      };

      /**
       * 增加一个动作。该动作会直接增加在当前元素中。
       * @func addAction
       */
      $scope.addAction = function () {
        actionService.addAction();
      };

      /**
       * 编辑区空白区域点击时调用此函数，用以清除已选元素、动作
       * @func onBackgroundClick
       * @private
       */
      $scope.onBackgroundClick = function () {
        elementService.deselectElement();
      };

      /**
       * 将一条Action渲染为文本信息
       * @func renderActionItem
       * @param {Action} action - 要渲染的action
       * @return {string} 文本信息
       */
      $scope.renderActionItem = function (action) {
        return actionService.renderActionItem(action);
      };

      /**
       * 将热点缩放至特定尺寸。函数保证热点不会超出屏幕。
       * @func resizeHotspotTo
       * @param {Element} ele - 关联的热点对象
       * @param {number|String} w - 宽度。可携带单位，比如10px
       * @param {number|String} h - 高度。同样可携带单位
       * @todo 屏幕应当可配置
       */
      $scope.resizeHotspotTo = function (ele, w, h) {
        return actionService.resizeHotspotTo(ele, w, h);
      };

      /**
       * 场景中鼠标移动时触发此函数。由于热点区域有多个可点击、拖动的对象，这个函数用来将其分发。
       * @func onSceneMoved
       * @param {event} $event - 点击事件
       * @private
       */
      $scope.onSceneMoved = function ($event) {
        var eT = this.editStat;
        var sT = eT.hotspotStack;
        var expT = eT.expanderStack;

        if (sT.hotspotMovingTarget !== null) {
          this.onHotspotMoved($event);
        }
        if (expT.expanderMovingTarget !== null) {
          this.onExpanderMove($event);
        }
      };

      /**
       * 场景中鼠标抬起时触发此函数。由于热点区域有多个可点击、拖动的对象，这个函数用来将其分发。
       * @func onSceneUp
       * @param {event} $event - 点击事件
       * @private
       */
      $scope.onSceneUp = function ($event) {
        // this.onHotspotUp($event);
        // this.onExpanderUp($event);
      };

      $scope.openUploaderWindow = function () {
        window.uploadSuccess = function (imageName) {
          var imgSrc = GLOBAL.host + 'packages/' + $routeParams.pkgId + '/' + imageName + '.png';
          $scope.editStat.selectedScene.background = imgSrc;
        };
        var x = screen.width / 2 - 700 / 2;
        var y = screen.height / 2 - 450 / 2;
        window.open(
//          '/api/uploader/#' + $routeParams.pkgId, //test
//          '/api/uploader/success.html#aaa' + $routeParams.pkgId, //test
          GLOBAL.host + 'api/uploader/#' + $routeParams.pkgId,
          'DescriptiveWindowName',
          'width=420,height=230,resizable,scrollbars=no,status=1,left=' + x + ',top=' + y
        );
      };

      /**
       * 保存编辑好的项目JSON数据
       */
      $scope.savePackage = function () {
        $http.post(GLOBAL.apiHost + 'saveProject/', {
          context: $scope.package
        })
          .success(function () {
            console.log('Package "' + $scope.package.appID + '" saved!');
          });
      };

    }]);
