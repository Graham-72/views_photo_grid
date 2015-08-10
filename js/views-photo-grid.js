/**
 * @file
 * Javascript for the Views Photo Grid module.
 */

(function ($) {

  Drupal.viewsPhotoGrid = {};
  Drupal.behaviors.viewsPhotoGrid = {};

  /**
   * Constructor for the row object.
   *
   * @param rowId
   *   The row's id. Added to the dom elements for identification purposes.
   * @param width
   *   The total width of the row that the row items must fit.
   * @param padding
   *   Padding between items in pixels.
   */
  Drupal.viewsPhotoGrid.gridRow = function (rowId, width, padding) {
    this.rowId = rowId;
    this.width = width;
    this.height = 0;
    this.padding = (typeof padding !== 'undefined' ? padding : 1);
    this.usedWidth = 0;
    this.items = [];
  };

  /**
   * Adds an item to the row. Keeps track of the width used by the item.
   *
   * @param item
   *   Row item object.
   */
  Drupal.viewsPhotoGrid.gridRow.prototype.addItem = function (item) {
    this.items.push(item);
    this.usedWidth = this.usedWidth + item.displayWidth;
  };

  /**
   * Returns the width available for additional items to be added.
   *
   * @returns
   *   Width in pixels.
   */
  Drupal.viewsPhotoGrid.gridRow.prototype.getAvailableWidth = function () {
    return this.width - this.usedWidth;
  }

  /**
   * Modifies an item's display size so that its height fits the row.
   *
   * @param item
   *   Item object.
   * @returns
   *   The modified item object.
   */
  Drupal.viewsPhotoGrid.gridRow.prototype.fitItem = function (item) {
    var aspect = item.width / item.height;
    var newWidth = Math.round(aspect * this.height);

    item.displayWidth = newWidth;
    item.displayHeight = this.height;

    return item;
  };

  /**
   * Sets the row's height, and adjusts all items currently in the row
   * to fit the new height.
   *
   * @param newHeight
   *   New height in pixels.
   */
  Drupal.viewsPhotoGrid.gridRow.prototype.adjustRowHeight = function (newHeight) {
    this.height = newHeight;

    // Iterate through existing items and set the height while maintaining
    // the aspect ratio.
    this.usedWidth = 0;
    for (var i = 0; i < this.items.length; i++) {
      var aspect = this.items[i].width / this.items[i].height;
      var newWidth = Math.round(aspect * this.height);

      this.items[i].displayWidth = newWidth;
      this.items[i].displayHeight = this.height;

      this.usedWidth = this.usedWidth + this.items[i].displayWidth;
    }
  };

  /**
   * Renders the row. Applies CSS to the items in the row.
   */
  Drupal.viewsPhotoGrid.gridRow.prototype.render = function () {
    if (this.items.length == 0) {
      // There isn't anything to render.
      return;
    }

    // Calculate how much space is available for row items when accounting
    // for padding.
    var targetWidth = this.width - (this.items.length - 1) * this.padding;

    // All items will be resized by a certain percentage to make them fit
    // the width calculated above.
    var adjustment;
    if (targetWidth < this.usedWidth) {
      adjustment = targetWidth / this.usedWidth;
    }
    else {
      // Content would need to be enlarged to fit. Leave as is.
      adjustment = 1;
    }
    this.height = Math.round(this.height * adjustment);

    // Keep track of the actual sized after adjustment. This will help
    // fix the discrepancy caused by rounding.
    var actualUsedWidth = 0;

    // Adjust widths so that the items fully fill in the full width.
    // Apply css to place items.
    for (var i = 0; i < this.items.length; i++) {

      if (adjustment != 1) {
        this.items[i].displayHeight = this.height;

        if (i < this.items.length - 1) {
          this.items[i].displayWidth = Math.round(this.items[i].displayWidth * adjustment);
          actualUsedWidth += this.items[i].displayWidth + this.padding;
        }
        else {
          // Last item. Use up all the space that's left. This will fix
          // rounding errors.
          this.items[i].displayWidth = this.width - actualUsedWidth;
          this.items[i].isLast = true;
        }
      }

      // Apply placement.
      $('#views-photo-grid-' + this.items[i].itemId).attr('data-row-id', this.rowId);
      $('#views-photo-grid-' + this.items[i].itemId + ' img').css('width', this.items[i].displayWidth + 'px');
      $('#views-photo-grid-' + this.items[i].itemId + ' img').css('height', this.items[i].displayHeight + 'px');
      if (!this.items[i].isLast) {
        $('#views-photo-grid-' + this.items[i].itemId + ' img').css('margin-right', this.padding + 'px');
      }
      else {
        $('#views-photo-grid-' + this.items[i].itemId + ' img').css('margin-right', '0px');
      }
    }

  };

  /**
   * Constructor for the row item object.
   *
   * @param itemId
   *   The item's id.
   */
  Drupal.viewsPhotoGrid.gridItem = function (itemId) {
    this.itemId = itemId;
    this.width = 0;
    this.height = 0;
    this.displayWidth = 0;
    this.displayHeight = 0;
    this.isLast = false;
  };

  /**
   *  Arranges the grid.
   */
  Drupal.behaviors.viewsPhotoGrid.arrangeGrid = function () {

    $('.views-photo-grid-container').each(function (containerIndex) {
      var container = $(this);
      var containerWidth = container.width();
      var items = [];

      // Find grid items, retrieve image sizes, and assign ids.
      container.find('.views-photo-grid-item').each(function (itemIndex) {

        // Create a unique id for this element.
        var itemId = containerIndex + '-' + itemIndex;
        $(this).attr('id', 'views-photo-grid-' + itemId);

        var img = $(this).find('img');

        // Remove css so that the actual size can be determined.
        $(this).find('img').css('height', '');
        $(this).find('img').css('width', '');

        var item = new Drupal.viewsPhotoGrid.gridItem(itemId);
        item.width = img.width();
        item.height = img.height();
        item.displayWidth = item.width;
        item.displayHeight = item.height;

        items.push(item);
      });

      // Arrange items into rows.
      var rowId = 0;
      var gridPadding = parseInt(Drupal.settings.viewsPhotoGrid.gridPadding);
      var row = new Drupal.viewsPhotoGrid.gridRow(rowId++, containerWidth, gridPadding);

      for (i = 0; i < items.length; i++) {
        var item = items[i];

        if (item.displayHeight < row.height || !row.height) {
          // This item is smaller than the current row height.
          // Need to shrink the row to avoid upscaling.
          row.adjustRowHeight(item.height);
        }
        else {
          // Resize the item to match the row height.
          item = row.fitItem(item);
        }

        row.addItem(item);

        // Check if adding this item has used up all the space.
        var availableWidth = row.getAvailableWidth();
        if (availableWidth <= 0) {
          // This item is the last one that fits the container.
          // Render, and start a new row.
          row.render();
          row = new Drupal.viewsPhotoGrid.gridRow(rowId++, containerWidth, gridPadding);
        }

      }

      // Last row is yet to be rendered.
      row.render();

    });

  }; // arrangeGrid()

  /**
   * Attaches behaviors.
   */
  Drupal.behaviors.viewsPhotoGrid.attach = function (context) {
    Drupal.behaviors.viewsPhotoGrid.arrangeGrid();
  };


})(jQuery);

jQuery(function() {
  jQuery(window).bind('resize', Drupal.behaviors.viewsPhotoGrid.arrangeGrid);
});