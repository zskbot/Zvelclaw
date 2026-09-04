> > [!NOTE]
> > This issue only affects Linux users who install `gh` from our APT or RPM package repositories. If you are on Windows or macOS, or you installed `gh` via Homebrew, GitHub Releases, or built from source code, this does not apply to you.
> 
>  
> - [What's happening?](#whats-happening)
> - [Am I affected?](#am-i-affected)
> - [How to confirm locally installed keyring?](#how-to-confirm-locally-installed-keyring)
>   - [Debian/Ubuntu](#debianubuntu)
>   - [RHEL/Fedora/CentOS/openSUSE/SUSE/Amazon Linux 2](#rhelfedoracentosopensusesuseamazon-linux-2)
> - [What do I need to do?](#what-do-i-need-to-do)
>   - [New users](#new-users)
>   - [Existing APT users (Debian/Ubuntu)](#existing-apt-users-debianubuntu)
>     - [Docker build failing?](#docker-build-failing)
>   - [Existing RPM users (Fedora, RHEL, CentOS, Amazon Linux 2, openSUSE/SUSE)](#existing-rpm-users-fedora-rhel-centos-amazon-linux-2-opensusesuse)
>     - [DNF5 (Fedora 41 or newer)](#dnf5-fedora-41-or-newer)
>     - [DNF4 (CentOS, RHEL, Fedora 40 or earlier)](#dnf4-centos-rhel-fedora-40-or-earlier)
>     - [Yum (Amazon Linux 2)](#yum-amazon-linux-2)
>     - [Zypper (openSUSE/SUSE)](#zypper-opensusesuse)
>     - [Removing old key from RPM keyrings](#removing-old-key-from-rpm-keyrings)
> - [Background](#background)
> - [Final notes](#final-notes)
> 
> 
> ## <a id="whats-happening">What's happening?</a>
> 
> The PGP key currently used to verify GitHub CLI Linux packages is expiring on **Saturday, September 5, 2026**. We have generated a new key and have already published an updated keyring file that contains both the old and new keys on **Wednesday, April 8, 2026**. This table lists the current and the new PGP key fingerprint:
> 
> | Key | Fingerprint |
> |---|---|
> | Current key (expires September 5, 2026) | `2C6106201985B60E6C7AC87323F3D4EA75716059` |
> | New key | `7F38BBB59D064DBCB3D84D725612B36462313325` |
> 
> As a background, back in September 2024, [our PGP signing key expired (#9569)](https://github.com/cli/cli/issues/9569), disrupting Linux package installs and updates. At that time, we extended the expiration of the existing key as an emergency fix. This time, however, we are proactively rotating to a brand-new key well ahead of the expiry date.
> 
> Check out [Am I affected?](#am-i-affected) below to see if you are going to be affected by this change. For affected users, package install and update operations that rely on the old key will start failing after the expiry date unless you follow the steps outlined in this document. Typical error/warning messages look like any of the following:
> 
> ```
> W: Failed to fetch https://cli.github.com/packages/dists/stable/InRelease  The following signatures were invalid: EXPKEYSIG 23F3D4EA75716059 GitHub CLI <opensource+cli@github.com> The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 5612B36462313325
> ```
> 
> ```
> Transaction failed: Signature verification failed.
> OpenPGP check for package ... from repo "gh-cli" has failed: Import of the key didn't help, wrong key?
> ```
> 
> ```
> The GPG keys listed for the "packages for the GitHub CLI" repository are already installed but they are not correct for this package.
> Check that the correct key URLs are configured for this repository.. Failing package is: gh...
>  GPG Keys are configured as: https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x23F3D4EA75716059
> ...
> Error: GPG check FAILED
> ```
> 
> ```
> The GPG keys listed for the "packages for the GitHub CLI" repository are already installed but they are not correct for this package.
> Check that the correct key URLs are configured for this repository.
> 
>  Failing package is: gh...
>  GPG Keys are configured as: https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x23F3D4EA75716059
> ```
> 
> ```
> Warning: File 'repomd.xml' from repository 'packages for the GitHub CLI' is signed with an unknown key '5612B36462313325'
> ...
>     Warning: We can't verify that no one meddled with this file, so it might not be
>     trustworthy anymore! You should not continue unless you know it's safe.
> ...
> Repository 'packages for the GitHub CLI' is invalid.
> [gh-cli|https://cli.github.com/packages/rpm] Valid metadata not found at specified URL
> History:
>  - Signature verification failed for repomd.xml
>  - Can't provide /repodata/repomd.xml
> ```
> 
> ```
> gh-... (packages for the GitHub CLI): Signature verification failed [4-Signatures public key is not available]
> ```
> 
> ```
> Warning: File 'repomd.xml' from repository 'packages for the GitHub CLI' is signed with an unknown key '5612B36462313325'
> ...
>     Warning: We can't verify that no one meddled with this file, so it might not be
>     trustworthy anymore! You should not continue unless you know it's safe.
> ...
> Repository 'packages for the GitHub CLI' is invalid.
> [gh-cli|https://cli.github.com/packages/rpm] Failed to retrieve new repository metadata.
> History:
>  - Signature verification failed for repomd.xml
> ```
> 
> ```
> error: Verifying a signature using certificate 2C6106201985B60E6C7AC87323F3D4EA75716059 (GitHub CLI <opensource+cli@github.com>):
>   1. Certificate 23F3D4EA75716059 invalid: certificate is not alive
>       because: The primary key is not live
>       because: Expired on 2026-09-05T12:44:10Z
>   2. Key 23F3D4EA75716059 invalid: key is not alive
>       because: The primary key is not live
>       because: Expired on 2026-09-05T12:44:10Z
> ```
> 
> ## <a id="am-i-affected">Am I affected?</a>
> 
> | Scenario | Affected? |
> |---|---|
> | You cannot install or upgrade `gh` | Probably. See [Existing APT users](#existing-apt-users-debianubuntu) or [Existing RPM users](#existing-rpm-users-fedora-rhel-centos-amazon-linux-2-opensusesuse). |
> | Installed `gh` via `apt` **before** the new keyring was published (April 8, 2026) and haven't re-run the installation steps since | **Yes**. See [Existing APT users](#existing-apt-users-debianubuntu). |
> | Installed `gh` via `dnf`, `yum`, or `zypper` **before** the new keyring was published (April 8, 2026) and haven't re-run the installation steps since | **Yes**. See [Existing RPM users](#existing-rpm-users-fedora-rhel-centos-amazon-linux-2-opensusesuse). |
> | Installed `gh` using official docs **after** the new keyring was published (April 8, 2026) | **No**. Your keyring already contains the new key. |
> | Installed `gh` via Homebrew, Conda, a community package manager, or from precompiled binaries | **No**. These methods do not use our PGP key. |
> | You do not remember when you installed `gh` | See [How to confirm locally installed keyring?](#how-to-confirm-locally-installed-keyring) |
> 
> 
> ## <a id="how-to-confirm-locally-installed-keyring">How to confirm locally installed keyring?</a>
> 
> If you do not remember when you installed `gh` from the official docs, you can easily confirm if you are going to be affected by checking your local configuration. Follow the subsection that applies to you.
> 
> ### <a id="debianubuntu">Debian/Ubuntu</a>
> 
> > [!TIP]
> > If `gpg` is not installed, you can install it with:
> > ```shell
> > sudo apt update
> > sudo apt install gnupg
> > ```
> 
> Check how many keys are in your local keyring file:
> 
> ```shell
> gpg --show-keys /etc/apt/keyrings/githubcli-archive-keyring.gpg
> ```
> 
> > [!TIP]
> > If the file is not found at that path, try the older location:
> >
> > ```shell
> > gpg --show-keys /usr/share/keyrings/githubcli-archive-keyring.gpg
> > ```
> >
> > If you still cannot find the keyring file, check your APT source entry to see the path it references:
> >
> > ```shell
> > cat /etc/apt/sources.list.d/github-cli.list
> > ```
> >
> > Look for the `signed-by=` value in the output, which points to your keyring file path.
> 
> If the output shows **two** public key entries (with fingerprints `2C6106201985B60E6C7AC87323F3D4EA75716059` and `7F38BBB59D064DBCB3D84D725612B36462313325`), you already have the updated keyring and no action is needed. This is what the output should look like:
> 
> ```
> pub   rsa4096 2022-09-06 [SC] [expires: 2026-09-05]
>       2C6106201985B60E6C7AC87323F3D4EA75716059
> uid                      GitHub CLI <opensource+cli@github.com>
> sub   rsa4096 2022-09-06 [E] [expires: 2026-09-05]
> 
> pub   rsa4096 2026-04-07 [SC]
>       7F38BBB59D064DBCB3D84D725612B36462313325
> uid                      GitHub CLI <opensource+cli@github.com>
> sub   rsa4096 2026-04-07 [E]
> ```
> 
> If only **one** key is listed (the old key `2C6106201985B60E6C7AC87323F3D4EA75716059`), you need to update your keyring. See [Existing APT users](#existing-apt-users-debianubuntu).
> 
> ### <a id="rhelfedoracentosopensusesuseamazon-linux-2">RHEL/Fedora/CentOS/openSUSE/SUSE/Amazon Linux 2</a> 
> 
> Check which GitHub CLI keys are imported in your RPM keyring:
> 
> ```shell
> rpm -qa gpg-pubkey | xargs -I{} sh -c 'rpm -qi {} | grep -q "opensource+cli@github.com" && echo {}'
> ```
> 
> If the output includes **only** one entry (the old key), you will need to update. See [Existing RPM users](#existing-rpm-users-fedora-rhel-centos-amazon-linux-2-opensusesuse).
> 
> If you see a second key entry, your system already has the new key and no action is needed.
> 
> ## <a id="what-do-i-need-to-do">What do I need to do?</a>
> 
> ### <a id="new-users">New users</a>
> 
> If you are installing `gh` for the first time, simply follow the standard [Linux installation instructions](https://github.com/cli/cli/blob/trunk/docs/install_linux.md). The current keyring file already contains the new key, so no extra steps are needed. This also applies if you installed `gh` for the first time after the new keyring was published (April 8, 2026).
> 
> ### <a id="existing-apt-users-debianubuntu">Existing APT users (Debian/Ubuntu)</a>
> 
> You need to replace your local copy of the keyring file. Run either of the following commands to download the updated keyring:
> 
> ```shell
> # Using wget
> sudo mkdir -p -m 755 /etc/apt/keyrings
> sudo wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
>     && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
> 
> # Using curl
> sudo mkdir -p -m 755 /etc/apt/keyrings
> sudo curl -fsSL -o /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
>     && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
> ```
> 
> Then update your package lists and upgrade `gh`:
> 
> ```shell
> sudo apt update
> sudo apt install gh
> ```
> 
> > [!NOTE]
> > If your keyring file is located elsewhere (e.g., under `/usr/share/keyrings/`), you should update that path in the command above. However, the recommended location is `/etc/apt/keyrings/`. Regardless of the path, make sure the `signed-by` field in the APT source entry (at `/etc/apt/sources.list.d/github-cli.list`) points at the right keyring file.
> 
> > [!TIP]
> > You can verify the updated keyring contains both keys by running:
> > ```shell
> > gpg --show-keys /etc/apt/keyrings/githubcli-archive-keyring.gpg
> > ```
> > You should see an output like this:
> > ```
> > pub   rsa4096 2022-09-06 [SC] [expired: 2026-09-05]
> >       2C6106201985B60E6C7AC87323F3D4EA75716059
> > uid                      GitHub CLI <opensource+cli@github.com>
> > sub   rsa4096 2022-09-06 [E] [expired: 2026-09-05]
> >
> > pub   rsa4096 2026-04-07 [SC]
> >       7F38BBB59D064DBCB3D84D725612B36462313325
> > uid                      GitHub CLI <opensource+cli@github.com>
> > sub   rsa4096 2026-04-07 [E]
> > ```
> 
> #### <a id="docker-build-failing">Docker build failing?</a>
> 
> If your Docker build is failing because a layer previously added our package repository and a later layer runs `apt update` or `apt-get update`, you need to ensure the updated keyring is present.
> 
> If you control the layer that adds the keyring, rebuild it so it pulls the latest keyring file.
> 
> If you don't control that layer, add a new layer **before** any `apt update` or `apt-get update` that fetches the updated keyring:
> 
> ```dockerfile
> RUN wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
>     && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
> ```
> 
> Or if you prefer using `curl`:
> 
> ```dockerfile
> RUN curl -fsSL -o /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
>     && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
> ```
> 
> If you don't use `gh` at all and it just happens to be in a base image, you can remove the repository so that `apt update` or `apt-get update` no longer try to verify it:
> 
> ```shell
> sudo rm /etc/apt/sources.list.d/github-cli.list
> ```
> 
> ### <a id="existing-rpm-users-fedora-rhel-centos-amazon-linux-2-opensusesuse">Existing RPM users (Fedora, RHEL, CentOS, Amazon Linux 2, openSUSE/SUSE)</a>
> 
> RPM-based systems import PGP keys into their own keyring at install time. To pick up the new key, you need to re-fetch the repository configuration file, which now references an updated keyring. Choose the instructions matching your package manager below.
> 
> Note that when upgrading `gh` at the end, your package manager will prompt you to confirm importing the PGP keys. Verify that the key fingerprints match the following:
> 
> - Old key: `2C6106201985B60E6C7AC87323F3D4EA75716059`
> - New key: `7F38BBB59D064DBCB3D84D725612B36462313325`
> 
> > [!IMPORTANT]
> > Instructions below mimic our [Linux installation guide](https://github.com/cli/cli/blob/trunk/docs/install_linux.md). So, please make sure you follow the heading that you originally used to install `gh`. 
> 
> #### <a id="dnf5-fedora-41-or-newer">DNF5 (Fedora 41 or newer)</a>
> 
> > [!TIP]
> > Run `dnf --version` if you are unsure what version you are using.
> 
> > [!NOTE]
> > Ensure the `config-manager` plugin is installed (for example, `sudo dnf install dnf5-plugins`).
> 
> ```shell
> sudo dnf config-manager addrepo --overwrite --from-repofile=https://cli.github.com/packages/rpm/gh-cli.repo
> sudo dnf update gh
> ```
> 
> #### <a id="dnf4-centos-rhel-fedora-40-or-earlier">DNF4 (CentOS, RHEL, Fedora 40 or earlier)</a>
> 
> > [!TIP]
> > Run `dnf --version` if you are unsure what version you are using.
> 
> > [!NOTE]
> > Ensure the `config-manager` plugin is installed (for example, `sudo dnf install 'dnf-command(config-manager)'`).
> 
> ```shell
> sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
> sudo dnf update gh
> ```
> 
> #### <a id="yum-amazon-linux-2">Yum (Amazon Linux 2)</a>
> 
> > [!NOTE]
> > Ensure the `config-manager` plugin is installed (for example, `sudo yum install yum-utils`).
> 
> ```shell
> sudo yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
> sudo yum update gh
> ```
> 
> #### <a id="zypper-opensusesuse">Zypper (openSUSE/SUSE)</a>
> 
> ```shell
> sudo zypper removerepo gh-cli
> sudo zypper addrepo https://cli.github.com/packages/rpm/gh-cli.repo
> sudo zypper update gh
> ```
> 
> #### <a id="removing-old-key-from-rpm-keyrings">Removing old key from RPM keyrings</a>
> 
> If you still encounter key verification errors after re-adding the repository, you may need to remove the old key from the RPM keyring first:
> 
> 1. Find the old PGP key:
>    ```shell
>    sudo rpm -qa gpg-pubkey
>    ```
>    Our old PGP key is usually named `gpg-pubkey-75716059-63172e8a` or `gpg-pubkey-2c6106201985b60e6c7ac87323f3d4ea75716059-63172e8a`. You can confirm the correct key by checking its Packager field:
> 
>    ```shell
>    sudo rpm -qi gpg-pubkey-75716059-63172e8a
>    # or
>    sudo rpm -qi gpg-pubkey-2c6106201985b60e6c7ac87323f3d4ea75716059-63172e8a
>    ```
>    The Packager should be `GitHub CLI <opensource+cli@github.com>`.
> 2. Once you have confirmed the Packager, remove the old PGP key:
>    ```shell
>    sudo rpm -e gpg-pubkey-75716059-63172e8a
>    # or
>    sudo rpm -e gpg-pubkey-2c6106201985b60e6c7ac87323f3d4ea75716059-63172e8a
>    ```
> 3. Then remove and reinstall `gh`:
>    ```shell
>    sudo dnf remove gh
>    sudo dnf install gh
>    ```
>    (Replace `dnf` with `yum` or `zypper` as appropriate.)
> 
> 
> ## <a id="background">Background</a>
> 
> In September 2024, [our PGP signing key expired (#9569)](https://github.com/cli/cli/issues/9569), disrupting Linux package installs and updates. At that time, we extended the expiration of the existing key as an emergency fix.
> 
> This time, we are proactively rotating to a brand-new key well ahead of the expiry date. The updated keyring files (binary [`.gpg`](https://cli.github.com/packages/githubcli-archive-keyring.gpg) and ASCII armored [`.asc`](https://cli.github.com/packages/githubcli-archive-keyring.asc)) already contain both the old and new keys, so anyone who has installed `gh` following our [Linux installation instructions](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) since April 8, 2026, is already covered.
> 
> ## <a id="final-notes">Final notes</a>
> 
> We apologize for any inconvenience this may cause. By announcing well in advance, we hope to give everyone enough time to update their keyring before the old key expires.
> 
> If you run into any problems, please follow up on this issue and we'll do our best to help.
> 
> Thank you for your patience and for using GitHub CLI!
> 

