default: help

help:
	@echo
	@echo 'targets:'
	@echo '  docs                      regenerate docs (requires Docco)'
	@echo '  gh-pages                  regenerate docs and push to gh-pages'
	@echo

clean:
	rm -rf docs

docs: clean
	docco --layout parallel --css docco-cl-parallel.css CL.js
	cp docco-cl-parallel.css docs/

gh-pages: docs
	git checkout gh-pages
	mv docs/CL.html index.html
	git add index.html
#	git commit -m "Regenerated docs"
#	git push
#	git checkout master

.PHONY: all push docs clean
